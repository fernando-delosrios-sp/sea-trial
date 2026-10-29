import { DefineWorkflow, Schema } from "@slack/deno-slack-sdk/mod.ts";
import { InvokeAgentFunction } from "../functions/invoke_agent/mod.ts";

const InvokeAgentWorkflow = DefineWorkflow({
  callback_id: "invoke_agent_workflow",
  title: "Invoke Requirements Agent",
  description: "Handles channel message events, Materials Drop uploads, and @mention agent routing",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      message_ts: { type: Schema.types.string },
      thread_ts: { type: Schema.types.string },
      text: { type: Schema.types.string },
    },
    required: ["channel_id", "user_id", "message_ts"],
  },
});

InvokeAgentWorkflow.addStep(InvokeAgentFunction, {
  channel_id: InvokeAgentWorkflow.inputs.channel_id,
  user_id: InvokeAgentWorkflow.inputs.user_id,
  message_ts: InvokeAgentWorkflow.inputs.message_ts,
  thread_ts: InvokeAgentWorkflow.inputs.thread_ts,
  text: InvokeAgentWorkflow.inputs.text,
});

export default InvokeAgentWorkflow;
