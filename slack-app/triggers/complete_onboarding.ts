import { TriggerContextData, TriggerTypes } from "@slack/deno-slack-api/mod.ts";
import OpenOnboardingWorkflow from "../workflows/open_onboarding.ts";

/**
 * Shared deploy-time link trigger for opening onboarding. Channel context comes
 * from TriggerContextData at invoke time; channel provision grants run access.
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

