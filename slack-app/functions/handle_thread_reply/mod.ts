import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import { isThreadContinuation } from "../../lib/agent-gate.ts";
import { withLogger } from "../../lib/logger.ts";

export const HandleThreadReplyFunction = DefineFunction({
  callback_id: "handle_thread_reply",
  title: "Handle Agent Thread Reply",
  source_file: "functions/handle_thread_reply/mod.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      message_ts: { type: Schema.types.string },
      thread_ts: { type: Schema.types.string },
      user_id: { type: Schema.slack.types.user_id },
    },
    required: ["channel_id", "message_ts", "user_id"],
  },
  output_parameters: {
    properties: {
      should_reinvoke: { type: Schema.types.boolean },
      thread_ts: { type: Schema.types.string },
    },
    required: ["should_reinvoke", "thread_ts"],
  },
});

export default SlackFunction(
  HandleThreadReplyFunction,
  async ({ inputs, env }) => {
    return await withLogger(env, async (logger) => {
      const shouldReinvoke = isThreadContinuation(
        inputs.message_ts,
        inputs.thread_ts,
      );

      logger.emit("thread_reply.evaluated", {
        channelId: inputs.channel_id,
        shouldReinvoke,
      });

      return {
        outputs: {
          should_reinvoke: shouldReinvoke,
          thread_ts: inputs.thread_ts ?? inputs.message_ts,
        },
      };
    });
  },
);

