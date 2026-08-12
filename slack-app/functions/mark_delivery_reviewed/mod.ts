import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import { readCanvasMarkdown, replaceCanvasContent } from "../../lib/canvas.ts";
import { deserializeEventContext } from "../../lib/event-context.ts";
import { clearDeliveryReviewFlag } from "../../lib/delivery-canvas.ts";
import { withLogger } from "../../lib/logger.ts";

export const MarkDeliveryReviewedFunction = DefineFunction({
  callback_id: "mark_delivery_reviewed",
  title: "Mark Delivery Canvas Reviewed",
  source_file: "functions/mark_delivery_reviewed/mod.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      canvas_id: { type: Schema.types.string },
      dashboard_canvas_content: { type: Schema.types.string },
    },
    required: ["channel_id", "user_id", "canvas_id", "dashboard_canvas_content"],
  },
  output_parameters: {
    properties: {
      reviewed: { type: Schema.types.boolean },
    },
    required: ["reviewed"],
  },
});

export default SlackFunction(
  MarkDeliveryReviewedFunction,
  async ({ inputs, client, env }) => {
    return await withLogger(env, async (logger) => {
      const context = deserializeEventContext(inputs.dashboard_canvas_content);
      if (!context) {
        return { error: "Could not load channel context from dashboard." };
      }

      const markdown = await readCanvasMarkdown(client, inputs.canvas_id);
      const cleared = clearDeliveryReviewFlag(markdown);
      await replaceCanvasContent(client, inputs.canvas_id, cleared);

      logger.emit("delivery.mark_reviewed.completed", {
        canvasId: inputs.canvas_id,
        channelId: inputs.channel_id,
      });

      return { outputs: { reviewed: true } };
    });
  },
);
