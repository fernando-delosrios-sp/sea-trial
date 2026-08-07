import { TriggerContextData, TriggerTypes } from "@slack/deno-slack-api/mod.ts";
import { OpenOnboardingFunction } from "../functions/open_onboarding/mod.ts";

/**
 * Link trigger for the pinned index "Complete onboarding" button.
 * Deploy with: slack trigger create --trigger-def triggers/complete_onboarding.ts
 */
const completeOnboardingTrigger = {
  type: TriggerTypes.Shortcut,
  name: "Complete Onboarding",
  description: "Open onboarding from the pinned index button",
  workflow: `#/functions/${OpenOnboardingFunction.definition.callback_id}`,
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

