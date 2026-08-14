import { TriggerContextData, TriggerTypes } from "@slack/deno-slack-api/mod.ts";
import type { ListedTrigger } from "./triggers-config.ts";
import type { SlackListApiCallResponse, SlackListClient } from "./lists.ts";
import OpenOnboardingWorkflow from "../workflows/open_onboarding.ts";
import {
  isKnownWorkflowLink,
  resolveWorkflowTriggerId,
  resolveWorkflowTriggerShareUrl,
} from "./workflow-trigger-registry.ts";

export interface WorkflowAssociationOptions {
  bookmark?: true;
  featured?: true;
}

type SlackApiResponse = SlackListApiCallResponse & {
  trigger?: {
    id?: string;
    share_url?: string;
    shortcut_url?: string;
  };
};

export interface WorkflowTriggerClient {
  apiCall?: SlackListClient["apiCall"];
  workflows: {
    triggers: {
      create?: (payload: Record<string, unknown>) => Promise<SlackApiResponse>;
      permissions: {
        set?: (payload: {
          trigger_id: string;
          permission_type?: string;
        }) => Promise<{ ok?: boolean; error?: string }>;
        add: (payload: {
          trigger_id: string;
          channel_ids?: string[];
        }) => Promise<{ ok?: boolean; error?: string }>;
      };
    };
    featured?: {
      add: (payload: {
        channel_id: string;
        trigger_ids: string[];
      }) => Promise<{ ok?: boolean; error?: string }>;
    };
  };
}

function resolveTriggerShareUrl(
  trigger: { id?: string; share_url?: string; shortcut_url?: string },
): string | undefined {
  const direct = trigger.share_url?.trim() || trigger.shortcut_url?.trim();
  if (direct) return direct;
  if (trigger.id) return `https://slack.com/shortcuts/${trigger.id}`;
  return undefined;
}

async function callWorkflowApi(
  client: WorkflowTriggerClient,
  method: string,
  params: Record<string, unknown>,
): Promise<{ ok?: boolean; error?: string }> {
  if (method === "workflows.triggers.permissions.set") {
    const set = client.workflows.triggers.permissions.set;
    if (set) {
      return set(params as { trigger_id: string; permission_type?: string });
    }
  }

  if (method === "workflows.triggers.permissions.add") {
    return client.workflows.triggers.permissions.add(
      params as { trigger_id: string; channel_ids?: string[] },
    );
  }

  if (method === "workflows.featured.add") {
    const add = client.workflows.featured?.add;
    if (add) {
      return add(
        params as { channel_id: string; trigger_ids: string[] },
      );
    }
  }

  if (client.apiCall) {
    return client.apiCall(method, params);
  }

  throw new Error(`Client does not support ${method}`);
}

/**
 * Restricts a trigger to named entities and grants the channel run access.
 * Populates the Workflows tab bookmarked list for link triggers.
 */
async function grantChannelTriggerAccess(
  client: WorkflowTriggerClient,
  triggerId: string,
  channelId: string,
): Promise<void> {
  const setResponse = await callWorkflowApi(
    client,
    "workflows.triggers.permissions.set",
    {
      trigger_id: triggerId,
      permission_type: "named_entities",
    },
  );

  if (!setResponse.ok) {
    throw new Error(
      `Failed to set workflow trigger permissions for ${triggerId}${
        setResponse.error ? `: ${setResponse.error}` : ""
      }`,
    );
  }

  const accessResponse = await callWorkflowApi(
    client,
    "workflows.triggers.permissions.add",
    {
      trigger_id: triggerId,
      channel_ids: [channelId],
    },
  );

  if (!accessResponse.ok) {
    throw new Error(
      `Failed to grant workflow trigger ${triggerId} access to channel ${channelId}${
        accessResponse.error ? `: ${accessResponse.error}` : ""
      }`,
    );
  }
}

/**
 * Ensures the channel Workflows header tab exists and lists the trigger.
 * Slack exposes no bookmark-only tab API; featured.add creates the tab surface.
 */
async function ensureWorkflowsChannelTab(
  client: WorkflowTriggerClient,
  channelId: string,
  triggerId: string,
): Promise<void> {
  const featuredResponse = await callWorkflowApi(
    client,
    "workflows.featured.add",
    {
      channel_id: channelId,
      trigger_ids: [triggerId],
    },
  );

  if (!featuredResponse.ok) {
    throw new Error(
      `Failed to add workflow trigger ${triggerId} to channel ${channelId} Workflows tab${
        featuredResponse.error ? `: ${featuredResponse.error}` : ""
      }`,
    );
  }
}

/**
 * Creates a channel-scoped onboarding shortcut, grants access, and surfaces
 * it in the channel Workflows tab.
 */
async function createChannelOnboardingTrigger(
  client: WorkflowTriggerClient,
  channelId: string,
  dashboardCanvasId: string,
): Promise<string> {
  const create = client.workflows.triggers.create;
  if (!create) {
    throw new Error("Client does not support workflows.triggers.create");
  }

  const triggerResponse = await create({
    type: TriggerTypes.Shortcut,
    name: "Complete Onboarding",
    description: `Open onboarding for TES Event Channel ${channelId}`,
    workflow: `#/workflows/${OpenOnboardingWorkflow.definition.callback_id}`,
    inputs: {
      interactivity: {
        value: TriggerContextData.Shortcut.interactivity,
      },
      channel_id: { value: channelId },
      dashboard_canvas_id: { value: dashboardCanvasId },
    },
  });

  if (!triggerResponse.ok || !triggerResponse.trigger?.id) {
    throw new Error(
      `Failed to create onboarding trigger for channel ${channelId}${
        triggerResponse.error ? `: ${triggerResponse.error}` : ""
      }`,
    );
  }

  const triggerId = triggerResponse.trigger.id;
  await grantChannelTriggerAccess(client, triggerId, channelId);
  await ensureWorkflowsChannelTab(client, channelId, triggerId);

  const shareUrl = resolveTriggerShareUrl(triggerResponse.trigger);
  if (!shareUrl) {
    throw new Error(
      `Onboarding trigger created but share URL missing for channel ${channelId}`,
    );
  }

  return shareUrl;
}

/**
 * Grants a shared deploy-time workflow trigger channel-scoped run access and
 * optional Workflows tab surfacing.
 */
export async function associateWorkflowWithChannel(
  client: WorkflowTriggerClient,
  channelId: string,
  triggerId: string,
  options: WorkflowAssociationOptions = {},
): Promise<string | undefined> {
  if (options.bookmark === true) {
    await grantChannelTriggerAccess(client, triggerId, channelId);
    await ensureWorkflowsChannelTab(client, channelId, triggerId);
  }

  if (options.featured === true) {
    await ensureWorkflowsChannelTab(client, channelId, triggerId);
  }

  return resolveWorkflowTriggerShareUrl(triggerId);
}

/**
 * Resolves a workflow step link and provisions channel workflow surfacing.
 */
export async function provisionWorkflowChannelAssociation(
  client: WorkflowTriggerClient,
  channelId: string,
  link: string,
  options: WorkflowAssociationOptions = {},
  env?: Record<string, string | undefined>,
  listedTriggers?: ListedTrigger[],
  dashboardCanvasId?: string,
): Promise<string | undefined> {
  if (!isKnownWorkflowLink(link)) {
    throw new Error(`Unknown workflow link "${link}"`);
  }

  if (link === "open_onboarding_workflow" && options.bookmark === true) {
    if (!dashboardCanvasId) {
      throw new Error(
        'Workflow step "open_onboarding_workflow" requires dashboard canvas to be provisioned first',
      );
    }
    return await createChannelOnboardingTrigger(
      client,
      channelId,
      dashboardCanvasId,
    );
  }

  const triggerId = resolveWorkflowTriggerId(link, env, listedTriggers);
  if (!triggerId) {
    if (options.bookmark === true || options.featured === true) {
      throw new Error(
        `Cannot resolve deploy-time trigger for workflow link "${link}" — set SLACK_ONBOARDING_TRIGGER_ID or redeploy triggers`,
      );
    }
    return undefined;
  }

  return await associateWorkflowWithChannel(
    client,
    channelId,
    triggerId,
    options,
  );
}

/** @deprecated Use provisionWorkflowChannelAssociation. */
export async function provisionOnboardingChannelShortcut(
  client: WorkflowTriggerClient,
  channelId: string,
  dashboardCanvasId: string,
  _dashboardCanvasContent = "",
  env?: Record<string, string | undefined>,
): Promise<string | undefined> {
  return await provisionWorkflowChannelAssociation(
    client,
    channelId,
    "open_onboarding_workflow",
    { bookmark: true },
    env,
    undefined,
    dashboardCanvasId,
  );
}
