import { TriggerContextData, TriggerTypes } from "@slack/deno-slack-api/mod.ts";
import OpenOnboardingWorkflow from "../workflows/open_onboarding.ts";

/**
 * Shared deploy-time Complete Onboarding shortcut. Disabled in triggers.config.yaml
 * because a canvas click cannot supply dashboard_canvas_id. Prefer the Dashboard
 * Complete onboarding link (per-channel Onboarding Link Trigger) or the pinned
 * index button.
 */
const completeOnboardingTrigger = {
  type: TriggerTypes.Shortcut,
  name: "Complete Onboarding",
  description: "Open onboarding from the pinned index button",
  workflow: `#/workflows/${OpenOnboardingWorkflow.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
  },
};

export default completeOnboardingTrigger;

