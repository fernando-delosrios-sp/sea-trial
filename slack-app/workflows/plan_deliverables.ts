import { DefineWorkflow, Schema } from "@slack/deno-slack-sdk/mod.ts";
import { InvokeAgentFunction } from "../functions/invoke_agent/mod.ts";

const PlanDeliverablesWorkflow = DefineWorkflow({
  callback_id: "plan_deliverables_workflow",
  title: "Plan Deliverables",
  description: "Summons the Deliverables Agent from the Requirements Canvas action link",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
    },
    required: ["channel_id", "user_id"],
  },
});

PlanDeliverablesWorkflow.addStep(InvokeAgentFunction, {
  channel_id: PlanDeliverablesWorkflow.inputs.channel_id,
  user_id: PlanDeliverablesWorkflow.inputs.user_id,
  message_ts: "",
  text: "@Sea Trial requirements plan deliverables",
});

export default PlanDeliverablesWorkflow;
