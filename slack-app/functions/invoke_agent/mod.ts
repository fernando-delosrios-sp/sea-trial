import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import { runInvokeAgentHandler } from "../../lib/invoke-agent-handler.ts";
import { withLogger } from "../../lib/logger.ts";

export const InvokeAgentFunction = DefineFunction({
  callback_id: "invoke_agent",
  title: "Invoke Requirements Agent",
  source_file: "functions/invoke_agent/mod.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      message_ts: { type: Schema.types.string },
      thread_ts: { type: Schema.types.string },
      dashboard_canvas_content: { type: Schema.types.string },
      requirements_canvas_content: { type: Schema.types.string },
      file_ids: {
        type: Schema.types.array,
        items: { type: Schema.types.string },
      },
    },
    required: [
      "channel_id",
      "user_id",
      "message_ts",
      "dashboard_canvas_content",
      "requirements_canvas_content",
    ],
  },
  output_parameters: {
    properties: {
      thread_ts: { type: Schema.types.string },
    },
    required: ["thread_ts"],
  },
});

export default SlackFunction(
  InvokeAgentFunction,
  async ({ inputs, client, env }) => {
    return await withLogger(env, async (logger) => {
      return await runInvokeAgentHandler(inputs, client, env, logger);
    });
  },
);
