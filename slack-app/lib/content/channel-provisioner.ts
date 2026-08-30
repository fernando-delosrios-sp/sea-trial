import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import type { SlackCanvasClient } from "../canvas.ts";
import { createCanvas, replaceCanvasContent } from "../canvas.ts";
import type { SlackListClient } from "../lists.ts";
import {
  attachListToChannel,
  createDeliverablesList,
  createIncidentsList,
} from "../lists.ts";
import { serializeEventContextSnapshot } from "../event-context.ts";
import {
  applyStepIds,
  loadComposition,
  type CanvasStep,
  type CompositionManifest,
  type CompositionStep,
} from "./composition-resolver.ts";
import {
  renderDashboardCanvasForSlack,
  type CanvasAssetUploadClient,
} from "./canvas-assets.ts";
import {
  renderInfrastructureCanvas,
  renderRequirementsCanvas,
  renderSituationReportSeedCanvas,
} from "./canvas-renderer.ts";
import {
  renderPinnedIndexBlocks,
  renderPinnedIndexMessage,
} from "./message-renderer.ts";
import { isKindProvisionable } from "./kind-registry.ts";
import {
  grantCompleteOnboardingToChannel,
  requireCompleteOnboardingTriggerId,
  type CompleteOnboardingGrantClient,
} from "../complete-onboarding-grant.ts";
import {
  putTesEventContext,
  type TesEventContextStoreClient,
} from "../tes-event-context-store.ts";

function resolveProvisionTeamId(
  env?: Record<string, string | undefined>,
): string {
  const teamId = env?.["SLACK_TEAM_ID"]?.trim();
  if (!teamId) {
    throw new Error(
      "SLACK_TEAM_ID is required to build pinned index navigation links",
    );
  }
  return teamId;
}

export interface ProvisionInputs {
  channel_id: string;
  project_name: string;
  account_name?: string;
  salesforce_opportunity_url?: string;
  member_user_ids?: string[];
  context_notes?: string;
  env?: Record<string, string | undefined>;
}

export interface ChannelProvisionClient
  extends SlackCanvasClient, SlackListClient, CanvasAssetUploadClient,
    TesEventContextStoreClient, CompleteOnboardingGrantClient {
  chat: {
    postMessage: (params: {
      channel: string;
      text: string;
      blocks?: Record<string, unknown>[];
    }) => Promise<{ ts?: string; ok?: boolean; error?: string }>;
  };
  pins: {
    add: (params: { channel: string; timestamp: string }) => Promise<unknown>;
  };
}

function shouldProvisionStep(step: CompositionStep): boolean {
  if (step.kind === "canvas" || step.kind === "list") {
    return isKindProvisionable(step.kind);
  }
  return false;
}

async function provisionCanvasStep(
  client: ChannelProvisionClient,
  step: CanvasStep,
  channelId: string,
  context: TesEventContext,
): Promise<string> {
  const content = await renderCanvasContent(
    client,
    step.ref,
    channelId,
    context,
  );

  return await createCanvas(client, {
    ...(step.tab === true ? { channelId } : {}),
    title: step.title ?? step.ref,
    content,
  });
}

async function renderCanvasContent(
  client: ChannelProvisionClient,
  ref: string,
  channelId: string,
  context: TesEventContext,
): Promise<string> {
  switch (ref) {
    case "requirements":
      return renderRequirementsCanvas();
    case "infrastructure":
      return renderInfrastructureCanvas();
    case "situation-report":
      return renderSituationReportSeedCanvas(context);
    case "dashboard":
      return await renderDashboardCanvasForSlack(client, channelId, context);
    default:
      throw new Error(`Unknown canvas ref "${ref}"`);
  }
}

async function provisionListStep(
  client: ChannelProvisionClient,
  step: ListStep,
  channelId: string,
  context: TesEventContext,
  env?: Record<string, string | undefined>,
): Promise<string> {
  const listOptions = {
    accountName: context.accountName,
    attachToChannel: false,
  };

  let listId: string;
  let displayName: string;
  if (step.ref === "deliverables") {
    ({ listId, displayName } = await createDeliverablesList(
      client,
      channelId,
      listOptions,
    ));
  } else if (step.ref === "incidents") {
    ({ listId, displayName } = await createIncidentsList(
      client,
      channelId,
      listOptions,
    ));
  } else {
    throw new Error(`Unknown list ref "${step.ref}"`);
  }

  if (step.bookmark === true) {
    await attachListToChannel(client, channelId, listId, {
      listTitle: displayName,
      teamId: resolveProvisionTeamId(env),
    });
  }

  return listId;
}

async function postPinnedIndex(
  client: ChannelProvisionClient,
  channelId: string,
  context: TesEventContext,
  composition: CompositionManifest,
  env?: Record<string, string | undefined>,
): Promise<string> {
  const navOptions = { teamId: resolveProvisionTeamId(env) };
  const indexMessage = await client.chat.postMessage({
    channel: channelId,
    text: renderPinnedIndexMessage(context, composition, navOptions),
    blocks: renderPinnedIndexBlocks(context, composition, navOptions),
  });

  const timestamp = indexMessage.ts?.trim();
  if (indexMessage.ok === false || !timestamp) {
    const detail = indexMessage.error ? `: ${indexMessage.error}` : "";
    throw new Error(`Failed to post pinned index${detail}`);
  }

  await client.pins.add({ channel: channelId, timestamp });
  return timestamp;
}

async function finalizeDashboardCanvas(
  client: ChannelProvisionClient,
  channelId: string,
  context: TesEventContext,
): Promise<void> {
  if (!context.dashboardCanvasId) return;

  const content = await renderDashboardCanvasForSlack(
    client,
    channelId,
    context,
  );

  await replaceCanvasContent(client, context.dashboardCanvasId, content);
}

/**
 * Provisions all channel objects defined in the composition manifest.
 * @returns Fully populated TesEventContext with serialized metadata-ready state
 */
export async function provisionChannel(
  client: ChannelProvisionClient,
  inputs: ProvisionInputs,
  channelType = "tes-event",
  compositionOverride?: CompositionManifest,
): Promise<TesEventContext> {
  const composition = compositionOverride ?? loadComposition(channelType);

  let context: TesEventContext = {
    channelId: inputs.channel_id,
    projectName: inputs.project_name,
    onboardingComplete: false,
    derivedComponents: [],
    dashboardCanvasId: "",
    requirementsCanvasId: "",
    deliverablesListId: "",
    incidentsListId: "",
    infrastructureCanvasId: "",
    situationReportCanvasId: "",
    accountName: inputs.account_name,
    salesforceOpportunityUrl: inputs.salesforce_opportunity_url,
    memberUserIds: inputs.member_user_ids,
    contextNotes: inputs.context_notes,
    channelType,
    compositionVersion: composition.version,
  };

  const stepIds: Record<string, string> = {};

  for (const step of composition.steps) {
    if (!shouldProvisionStep(step)) continue;

    switch (step.kind) {
      case "canvas": {
        const slackId = await provisionCanvasStep(
          client,
          step,
          inputs.channel_id,
          context,
        );
        stepIds[step.id] = slackId;
        context = applyStepIds(context, stepIds);
        break;
      }
      case "list": {
        const listId = await provisionListStep(
          client,
          step,
          inputs.channel_id,
          context,
          inputs.env,
        );
        stepIds[step.id] = listId;
        context = applyStepIds(context, stepIds);
        break;
      }
      default:
        throw new Error(`Unsupported step kind "${(step as CompositionStep).kind}"`);
    }
  }

  await postPinnedIndex(
    client,
    inputs.channel_id,
    context,
    composition,
    inputs.env,
  );

  await finalizeDashboardCanvas(
    client,
    inputs.channel_id,
    context,
  );

  await putTesEventContext(client, context);
  await grantCompleteOnboardingToChannel(
    client,
    requireCompleteOnboardingTriggerId(inputs.env),
    inputs.channel_id,
  );

  return context;
}

/** Serializes context for workflow output after provisioning. */
export function serializeProvisionedContext(context: TesEventContext): string {
  return serializeEventContextSnapshot(context);
}
