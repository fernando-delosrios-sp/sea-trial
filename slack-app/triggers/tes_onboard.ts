import { TriggerContextData, TriggerTypes } from "@slack/deno-slack-api/mod.ts";
import OpenOnboardingWorkflow from "../workflows/open_onboarding.ts";

const tesOnboardTrigger = {
  type: TriggerTypes.Shortcut,
  name: "TES Onboard",
  description:
    "Legacy channel shortcut — prefer Complete onboarding on the pinned index",
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

export default tesOnboardTrigger;


