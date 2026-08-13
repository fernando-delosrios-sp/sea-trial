import { TriggerContextData, TriggerTypes } from "@slack/deno-slack-api/mod.ts";
import OpenOnboardingWorkflow from "../workflows/open_onboarding.ts";

/**
 * Global shortcut fallback for opening onboarding (channel shortcuts are
 * provisioned per TES Event Channel at create time).
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
    dashboard_canvas_content: {
      value: "",
    },
  },
};

export default completeOnboardingTrigger;

