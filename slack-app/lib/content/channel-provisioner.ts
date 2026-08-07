import type { TesEventContext } from "@tes/shared/types/index.ts";
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
  renderDashboardCanvas,
  renderInfrastructureCanvas,
  renderRequirementsCanvas,
} from "./canvas-renderer.ts";
import {
  renderPinnedIndexBlocks,
  renderPinnedIndexMessage,
} from "./message-renderer.ts";
import { isKindProvisionable } from "./kind-registry.ts";

export interface ProvisionInputs {
  channel_id: string;
  project_name: string;
  account_name?: string;
  salesforce_opportunity_url?: string;
  member_user_ids?: string[];
  context_notes?: string;
}

export interface ChannelProvisionClient extends SlackCanvasClient, SlackListClient {
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

async function provisionResource(
  client: ChannelProvisionClient,
  entry: ProvisionEntry,
  channelId: string,
  context: TesEventContext,
): Promise<string> {
  if (!isKindProvisionable(entry.kind)) {
    throw new Error(
      `Kind "${entry.kind}" is not provisionable (api_availability !== stable)`,
    );
  }

  switch (entry.kind) {
    case "canvas": {
      const content = renderCanvasContent(entry.ref, context);
      const canvasId = await createCanvas(client, {
        channelId,
        title: entry.title ?? entry.ref,
        content,
      });

      if (entry.ref === "dashboard") {
        await replaceCanvasContent(
          client,
          canvasId,
          renderDashboardCanvas(context),
        );
      }

      return canvasId;
    }
    case "list": {
      if (entry.ref === "deliverables") {
        return await createDeliverablesList(client, channelId);
      }
      if (entry.ref === "incidents") {
        return await createIncidentsList(client, channelId);
      }
      throw new Error(`Unknown list ref "${entry.ref}"`);
    }
    default:
      throw new Error(`Unsupported resource kind "${entry.kind}" for slot "${entry.slot}"`);
  }
}

function renderCanvasContent(ref: string, context: TesEventContext): string {
  switch (ref) {
    case "requirements":
      return renderRequirementsCanvas();
    case "infrastructure":
      return renderInfrastructureCanvas();
    case "dashboard":
      return renderDashboardCanvas(context);
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
): Promise<void> {
  if (!isKindProvisionable(entry.kind)) return;

  if (entry.kind === "message" && entry.ref === "pinned-index") {
    const indexMessage = await client.chat.postMessage({
      channel: channelId,
      text: renderPinnedIndexMessage(context, composition),
      blocks: renderPinnedIndexBlocks(context, composition),
    });

    if (entry.pin && indexMessage.ts) {
      await client.pins.add({ channel: channelId, timestamp: indexMessage.ts });
    }
  }
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
    );
    slotIds[entry.slot] = slackId;
    context = applySlotIds(context, composition, slotIds);
  }

  for (const chromeEntry of composition.chrome ?? []) {
    await provisionChrome(
      client,
      chromeEntry,
      inputs.channel_id,
      context,
      composition,
    );
  }

  return context;
}

/** Serializes context for workflow output after provisioning. */
export function serializeProvisionedContext(context: TesEventContext): string {
  return serializeEventContext(context);
}
