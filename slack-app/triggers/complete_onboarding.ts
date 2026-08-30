import { TriggerContextData, TriggerTypes } from "@slack/deno-slack-api/mod.ts";
import OpenOnboardingWorkflow from "../workflows/open_onboarding.ts";

/**
 * Workspace shortcut Complete onboarding. Uses the channel in view and the
 * TES Event Context Store. Granted to each TES Event Channel at seed.
 */
const completeOnboardingTrigger = {
  type: TriggerTypes.Shortcut,
  name: "Complete onboarding",
  description: "Open onboarding for the TES Event Channel in view",
  workflow: `#/workflows/${OpenOnboardingWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default completeOnboardingTrigger;
