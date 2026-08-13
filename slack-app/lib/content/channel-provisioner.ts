import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import type { SlackCanvasClient } from "../canvas.ts";
import { createCanvas, replaceCanvasContent } from "../canvas.ts";
import type { SlackListClient } from "../lists.ts";
import {
  createDeliverablesList,
  createIncidentsList,
} from "../lists.ts";
import { serializeEventContext } from "../event-context.ts";
import {
  applySlotIds,
  loadComposition,
  resolveProvisioningOrder,
  type CompositionManifest,
  type ProvisionEntry,
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
import { buildOnboardingCanvasLink } from "../onboarding-canvas-link.ts";

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
  extends SlackCanvasClient, SlackListClient, CanvasAssetUploadClient {
  bookmarks: NonNullable<SlackListClient["bookmarks"]>;
  chat: {
    postMessage: (params: {
      channel: string;
      text: string;
      blocks?: Record<string, unknown>[];
    }) => Promise<{ ts?: string }>;
  };
  pins: {
    add: (params: { channel: string; timestamp: string }) => Promise<unknown>;
  };
}

function shouldAttachChannelTab(entry: ProvisionEntry): boolean {
  return entry.channel_tab !== false;
}

async function provisionResource(
  client: ChannelProvisionClient,
  entry: ProvisionEntry,
  channelId: string,
  context: TesEventContext,
  env?: Record<string, string | undefined>,
): Promise<string> {
  if (!isKindProvisionable(entry.kind)) {
    throw new Error(
      `Kind "${entry.kind}" is not provisionable (api_availability !== stable)`,
    );
  }

  switch (entry.kind) {
    case "canvas": {
      const content = await renderCanvasContent(
        client,
        entry.ref,
        channelId,
        context,
      );
      return await createCanvas(client, {
        ...(shouldAttachChannelTab(entry) ? { channelId } : {}),
        title: entry.title ?? entry.ref,
        content,
      });
    }
    case "list": {
      const listOptions = shouldAttachChannelTab(entry)
        ? {
          attachToChannel: true,
          teamId: resolveProvisionTeamId(env),
        }
        : { attachToChannel: false };

      if (entry.ref === "deliverables") {
        return await createDeliverablesList(client, channelId, listOptions);
      }
      if (entry.ref === "incidents") {
        return await createIncidentsList(client, channelId, listOptions);
      }
      throw new Error(`Unknown list ref "${entry.ref}"`);
    }
    default:
      throw new Error(`Unsupported resource kind "${entry.kind}" for slot "${entry.slot}"`);
  }
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

async function provisionChrome(
  client: ChannelProvisionClient,
  entry: ProvisionEntry,
  channelId: string,
  context: TesEventContext,
  composition: CompositionManifest,
  env?: Record<string, string | undefined>,
): Promise<string | undefined> {
  if (!isKindProvisionable(entry.kind)) return undefined;

  if (entry.kind === "message" && entry.ref === "pinned-index") {
    const navOptions = { teamId: resolveProvisionTeamId(env) };
    const indexMessage = await client.chat.postMessage({
      channel: channelId,
      text: renderPinnedIndexMessage(context, composition, navOptions),
      blocks: renderPinnedIndexBlocks(context, composition, navOptions),
    });

    if (entry.pin && indexMessage.ts) {
      await client.pins.add({ channel: channelId, timestamp: indexMessage.ts });
    }

    return indexMessage.ts;
  }

  return undefined;
}

async function finalizeDashboardCanvas(
  client: ChannelProvisionClient,
  channelId: string,
  context: TesEventContext,
  pinnedMessageTs?: string,
  env?: Record<string, string | undefined>,
): Promise<void> {
  if (!context.dashboardCanvasId) return;

  const onboardingLink = buildOnboardingCanvasLink(
    channelId,
    pinnedMessageTs,
    env,
  );
  const content = await renderDashboardCanvasForSlack(
    client,
    channelId,
    context,
    undefined,
    onboardingLink ? { onboardingLink } : undefined,
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
): Promise<TesEventContext> {
  const composition = loadComposition(channelType);
  const orderedResources = resolveProvisioningOrder(composition.resources);

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
    channelType: composition.channel_type,
    compositionVersion: composition.version,
  };

  const slotIds: Record<string, string> = {};

  for (const entry of orderedResources) {
    const slackId = await provisionResource(
      client,
      entry,
      inputs.channel_id,
      context,
      inputs.env,
    );
    slotIds[entry.slot] = slackId;
    context = applySlotIds(context, composition, slotIds);
  }

  let pinnedMessageTs: string | undefined;
  for (const chromeEntry of composition.chrome ?? []) {
    pinnedMessageTs = await provisionChrome(
      client,
      chromeEntry,
      inputs.channel_id,
      context,
      composition,
      inputs.env,
    ) ?? pinnedMessageTs;
  }

  await finalizeDashboardCanvas(
    client,
    inputs.channel_id,
    context,
    pinnedMessageTs,
    inputs.env,
  );

  return context;
}

/** Serializes context for workflow output after provisioning. */
export function serializeProvisionedContext(context: TesEventContext): string {
  return serializeEventContext(context);
}
