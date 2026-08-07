import { TriggerContextData, TriggerTypes } from "@slack/deno-slack-api/types.ts";
import OpenOnboardingFunction from "../functions/open_onboarding/mod.ts";

const tesOnboardTrigger = {
  type: TriggerTypes.Shortcut,
  name: "TES Onboard",
  description:
    "Legacy channel shortcut — prefer Complete onboarding on the pinned index (no Account pre-fill)",
  workflow: `#/functions/${OpenOnboardingFunction.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: TriggerContextData.shortcut.channel_id,
    },
    interactivity: {
      value: TriggerContextData.shortcut.interactivity,
    },
    dashboard_canvas_content: {
      value: "",
    },
  },
};

export default tesOnboardTrigger;

