import {
  TriggerContextData,
  TriggerTypes,
} from "@slack/deno-slack-api/types.ts";
import CreateTesEventWorkflow from "../workflows/create_tes_event.ts";

const createTesEventTrigger = {
  type: TriggerTypes.Shortcut,
  name: "Create TES Event",
  description: "Create a new TES Event Channel",
  workflow: `#/workflows/${CreateTesEventWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.shortcut.interactivity,
    },
  },
};

export default createTesEventTrigger;
