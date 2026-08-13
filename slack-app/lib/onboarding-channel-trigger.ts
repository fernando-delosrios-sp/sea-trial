import { TriggerContextData, TriggerTypes } from "@slack/deno-slack-api/mod.ts";
import OpenOnboardingWorkflow from "../workflows/open_onboarding.ts";

export interface OnboardingTriggerClient {
  workflows: {
    triggers: {
      create: (payload: Record<string, unknown>) => Promise<{
        ok?: boolean;
        error?: string;
        trigger?: {
          id?: string;
          share_url?: string;
          shortcut_url?: string;
        };
      }>;
      permissions: {
        add: (payload: {
          trigger_id: string;
          channel_ids?: string[];
        }) => Promise<{ ok?: boolean; error?: string }>;
      };
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

/**
 * Creates a channel-scoped "Complete onboarding" shortcut and grants access
 * to the provisioned TES Event Channel.
 */
export async function provisionOnboardingChannelShortcut(
  client: OnboardingTriggerClient,
  channelId: string,
  dashboardCanvasId: string,
): Promise<string | undefined> {
  const triggerResponse = await client.workflows.triggers.create({
    type: TriggerTypes.Shortcut,
    name: "Complete Onboarding",
    description: `Open onboarding for TES Event Channel ${channelId}`,
    workflow:
      `#/workflows/${OpenOnboardingWorkflow.definition.callback_id}`,
    inputs: {
      interactivity: {
        value: TriggerContextData.Shortcut.interactivity,
      },
      channel_id: { value: channelId },
      dashboard_canvas_content: { value: "" },
      dashboard_canvas_id: { value: dashboardCanvasId },
    },
  });

  if (!triggerResponse.ok || !triggerResponse.trigger?.id) {
    return undefined;
  }

  const accessResponse = await client.workflows.triggers.permissions.add({
    trigger_id: triggerResponse.trigger.id,
    channel_ids: [channelId],
  });

  if (!accessResponse.ok) {
    return undefined;
  }

  return resolveTriggerShareUrl(triggerResponse.trigger);
}
