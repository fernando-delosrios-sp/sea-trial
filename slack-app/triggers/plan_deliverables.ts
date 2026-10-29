import { TriggerContextData, TriggerTypes } from "@slack/deno-slack-api/mod.ts";
import PlanDeliverablesWorkflow from "../workflows/plan_deliverables.ts";

/**
 * Link trigger embedded in the Requirements Canvas to trigger deliverable planning.
 */
const planDeliverablesTrigger = {
  type: TriggerTypes.Shortcut,
  name: "Plan deliverables",
  description: "Summon Deliverables Agent from the Requirements Canvas action link",
  workflow: `#/workflows/${PlanDeliverablesWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    channel_id: {
      value: TriggerContextData.Shortcut.channel_id,
    },
    user_id: {
      value: TriggerContextData.Shortcut.user_id,
    },
  },
};

export default planDeliverablesTrigger;
