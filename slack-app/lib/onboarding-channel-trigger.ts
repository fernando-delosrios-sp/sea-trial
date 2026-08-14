import type { ListedTrigger } from "./triggers-config.ts";
import {
  isKnownWorkflowLink,
  resolveWorkflowTriggerId,
  resolveWorkflowTriggerShareUrl,
} from "./workflow-trigger-registry.ts";

export interface WorkflowAssociationOptions {
  bookmark?: true;
  featured?: true;
}

export interface WorkflowTriggerClient {
  workflows: {
    triggers: {
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
    if (client.workflows.triggers.permissions.set) {
      const basePermissions = await client.workflows.triggers.permissions.set({
        trigger_id: triggerId,
        permission_type: "named_entities",
      });
      if (!basePermissions.ok) {
        throw new Error(
          `Failed to set workflow trigger permissions for ${triggerId}${
            basePermissions.error ? `: ${basePermissions.error}` : ""
          }`,
        );
      }
    }

    const accessResponse = await client.workflows.triggers.permissions.add({
      trigger_id: triggerId,
      channel_ids: [channelId],
    });

    if (!accessResponse.ok) {
      throw new Error(
        `Failed to grant workflow trigger ${triggerId} access to channel ${channelId}${
          accessResponse.error ? `: ${accessResponse.error}` : ""
        }`,
      );
    }
  }

  if (options.featured === true && client.workflows.featured?.add) {
    const featuredResponse = await client.workflows.featured.add({
      channel_id: channelId,
      trigger_ids: [triggerId],
    });
    if (!featuredResponse.ok) {
      throw new Error(
        `Failed to feature workflow trigger ${triggerId} in channel ${channelId}${
          featuredResponse.error ? `: ${featuredResponse.error}` : ""
        }`,
      );
    }
  }

  return resolveWorkflowTriggerShareUrl(triggerId);
}

/**
 * Resolves a workflow step link to the shared deploy-time trigger and associates
 * it with the provisioned channel.
 */
export async function provisionWorkflowChannelAssociation(
  client: WorkflowTriggerClient,
  channelId: string,
  link: string,
  options: WorkflowAssociationOptions = {},
  env?: Record<string, string | undefined>,
  listedTriggers?: ListedTrigger[],
): Promise<string | undefined> {
  if (!isKnownWorkflowLink(link)) {
    throw new Error(`Unknown workflow link "${link}"`);
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
  _dashboardCanvasId: string,
  _dashboardCanvasContent = "",
  env?: Record<string, string | undefined>,
): Promise<string | undefined> {
  return await provisionWorkflowChannelAssociation(
    client,
    channelId,
    "open_onboarding_workflow",
    { bookmark: true },
    env,
  );
}
