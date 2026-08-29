/**
 * Per-channel Onboarding Link Trigger used as the Dashboard canvas CTA.
 * Not associated with the channel Workflows tab.
 * The trigger context snapshot is baked at create and rewritten on every
 * successful onboarding submit.
 */
import { TriggerContextData, TriggerTypes } from "@slack/deno-slack-api/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import type { SlackListApiCallResponse, SlackListClient } from "./lists.ts";
import OpenOnboardingWorkflow from "../workflows/open_onboarding.ts";
import { buildProvisionTitle } from "./triggers-config.ts";
import { isKnownWorkflowLink } from "./workflow-trigger-registry.ts";
import { serializeEventContextSnapshot } from "./event-context.ts";

type SlackApiResponse = SlackListApiCallResponse & {
  trigger?: {
    id?: string;
    trigger_id?: string;
    share_url?: string;
    shortcut_url?: string;
  };
};

export interface WorkflowTriggerClient {
  apiCall?: SlackListClient["apiCall"];
  workflows: {
    triggers: {
      create?: (payload: Record<string, unknown>) => Promise<SlackApiResponse>;
      update?: (payload: Record<string, unknown>) => Promise<SlackApiResponse>;
      permissions: {
        set?: (payload: {
          trigger_id: string;
          permission_type?: string;
          channel_ids?: string[];
        }) => Promise<{ ok?: boolean; error?: string }>;
        add: (payload: {
          trigger_id: string;
          channel_ids?: string[];
        }) => Promise<{ ok?: boolean; error?: string }>;
      };
    };
  };
}

function parseTriggerId(
  trigger: { id?: string; trigger_id?: string },
): string | undefined {
  const id = trigger.id?.trim() || trigger.trigger_id?.trim();
  return id || undefined;
}

function parseTriggerShareUrl(
  trigger: { share_url?: string; shortcut_url?: string },
): string | undefined {
  const url = trigger.share_url?.trim() || trigger.shortcut_url?.trim();
  return url || undefined;
}

async function callWorkflowApi(
  client: WorkflowTriggerClient,
  method: string,
  params: Record<string, unknown>,
): Promise<{ ok?: boolean; error?: string }> {
  if (method === "workflows.triggers.permissions.set") {
    const set = client.workflows.triggers.permissions.set;
    if (set) {
      return set(params as {
        trigger_id: string;
        permission_type?: string;
        channel_ids?: string[];
      });
    }
  }

  if (method === "workflows.triggers.permissions.add") {
    return client.workflows.triggers.permissions.add(
      params as { trigger_id: string; channel_ids?: string[] },
    );
  }

  if (method === "workflows.triggers.update") {
    const update = client.workflows.triggers.update;
    if (update) {
      return update(params);
    }
  }

  if (client.apiCall) {
    return client.apiCall(method, params);
  }

  throw new Error(`Client does not support ${method}`);
}

/**
 * Grants channel run access for a trigger.
 *
 * `permissions.add` only works when the trigger is already `named_entities`.
 * Otherwise `permissions.set` must include `channel_ids` in the same call —
 * setting empty `named_entities` returns `named_entities_cannot_be_empty`.
 */
async function grantChannelTriggerAccess(
  client: WorkflowTriggerClient,
  triggerId: string,
  channelId: string,
): Promise<void> {
  const addResponse = await callWorkflowApi(
    client,
    "workflows.triggers.permissions.add",
    {
      trigger_id: triggerId,
      channel_ids: [channelId],
    },
  );

  if (addResponse.ok) {
    return;
  }

  if (addResponse.error === "invalid_permission_type") {
    const setResponse = await callWorkflowApi(
      client,
      "workflows.triggers.permissions.set",
      {
        trigger_id: triggerId,
        permission_type: "named_entities",
        channel_ids: [channelId],
      },
    );

    if (!setResponse.ok) {
      throw new Error(
        `Failed to set workflow trigger permissions for ${triggerId}${
          setResponse.error ? `: ${setResponse.error}` : ""
        }`,
      );
    }
    return;
  }

  throw new Error(
    `Failed to grant workflow trigger ${triggerId} access to channel ${channelId}${
      addResponse.error ? `: ${addResponse.error}` : ""
    }`,
  );
}

/**
 * Creates a per-channel Onboarding Link Trigger with baked channel ID, Dashboard
 * ID, trigger id, share URL, and compact TesEventContext snapshot. Open/submit
 * use that snapshot — not canvas lookup. Submit refreshes the snapshot. The
 * Dashboard Complete onboarding href must use the API share URL — never a URL
 * synthesized from trigger ID.
 */
export interface ChannelOnboardingTrigger {
  triggerId: string;
  shareUrl: string;
}

export function withOnboardingTriggerIdentity(
  context: TesEventContext,
  trigger: ChannelOnboardingTrigger,
): TesEventContext {
  return {
    ...context,
    onboardingTriggerId: trigger.triggerId,
    onboardingLinkUrl: trigger.shareUrl,
  };
}

export async function createChannelOnboardingTrigger(
  client: WorkflowTriggerClient,
  channelId: string,
  dashboardCanvasId: string,
  eventContext: TesEventContext,
): Promise<ChannelOnboardingTrigger> {
  const create = client.workflows.triggers.create;
  if (!create) {
    throw new Error("Client does not support workflows.triggers.create");
  }

  const triggerResponse = await create({
    type: TriggerTypes.Shortcut,
    name: buildProvisionTitle("Complete Onboarding", "channel", channelId),
    description: `Open onboarding for TES Event Channel ${channelId}`,
    workflow: `#/workflows/${OpenOnboardingWorkflow.definition.callback_id}`,
    inputs: {
      interactivity: {
        value: TriggerContextData.Shortcut.interactivity,
      },
      channel_id: { value: channelId },
      dashboard_canvas_id: { value: dashboardCanvasId },
      dashboard_canvas_content: {
        value: serializeEventContextSnapshot(eventContext),
      },
    },
  });

  const trigger = triggerResponse.trigger;
  const triggerId = trigger ? parseTriggerId(trigger) : undefined;
  if (!triggerResponse.ok || !triggerId) {
    throw new Error(
      `Failed to create onboarding trigger for channel ${channelId}${
        triggerResponse.error ? `: ${triggerResponse.error}` : ""
      }`,
    );
  }

  await grantChannelTriggerAccess(client, triggerId, channelId);

  const shareUrl = parseTriggerShareUrl(trigger!);
  if (!shareUrl) {
    throw new Error(
      `Onboarding trigger created but share URL missing for channel ${channelId}`,
    );
  }

  const triggerIdentity: ChannelOnboardingTrigger = { triggerId, shareUrl };
  await updateOnboardingTriggerSnapshot(
    client,
    channelId,
    dashboardCanvasId,
    withOnboardingTriggerIdentity(eventContext, triggerIdentity),
  );

  return triggerIdentity;
}

export async function updateOnboardingTriggerSnapshot(
  client: WorkflowTriggerClient,
  channelId: string,
  dashboardCanvasId: string,
  eventContext: TesEventContext,
): Promise<void> {
  const triggerId = eventContext.onboardingTriggerId?.trim();
  if (!triggerId) {
    throw new Error("missing onboardingTriggerId");
  }

  const updateResponse = await callWorkflowApi(
    client,
    "workflows.triggers.update",
    {
      trigger_id: triggerId,
      inputs: {
        interactivity: {
          value: TriggerContextData.Shortcut.interactivity,
        },
        channel_id: { value: channelId },
        dashboard_canvas_id: { value: dashboardCanvasId },
        dashboard_canvas_content: {
          value: serializeEventContextSnapshot(eventContext),
        },
      },
    },
  );
  if (!updateResponse.ok) {
    throw new Error(
      `Failed to refresh onboarding trigger snapshot for channel ${channelId}${
        updateResponse.error ? `: ${updateResponse.error}` : ""
      }`,
    );
  }
}

/**
 * Resolves a workflow step link and creates the per-channel Onboarding Link Trigger.
 */
export async function provisionWorkflowChannelAssociation(
  client: WorkflowTriggerClient,
  channelId: string,
  link: string,
  dashboardCanvasId?: string,
  eventContext?: TesEventContext,
): Promise<ChannelOnboardingTrigger> {
  if (!isKnownWorkflowLink(link)) {
    throw new Error(`Unknown workflow link "${link}"`);
  }

  if (link !== "open_onboarding_workflow") {
    throw new Error(`Unknown workflow link "${link}"`);
  }

  if (!dashboardCanvasId) {
    throw new Error(
      'Workflow step "open_onboarding_workflow" requires dashboard canvas to be provisioned first',
    );
  }

  if (!eventContext) {
    throw new Error(
      'Workflow step "open_onboarding_workflow" requires a TesEventContext snapshot',
    );
  }

  return await createChannelOnboardingTrigger(
    client,
    channelId,
    dashboardCanvasId,
    eventContext,
  );
}

/** @deprecated Use provisionWorkflowChannelAssociation. */
export async function provisionOnboardingChannelShortcut(
  client: WorkflowTriggerClient,
  channelId: string,
  dashboardCanvasId: string,
  eventContext: TesEventContext,
): Promise<ChannelOnboardingTrigger> {
  return await provisionWorkflowChannelAssociation(
    client,
    channelId,
    "open_onboarding_workflow",
    dashboardCanvasId,
    eventContext,
  );
}
