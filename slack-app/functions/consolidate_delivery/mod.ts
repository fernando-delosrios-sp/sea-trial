import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { deserializeEventContext } from "../../lib/event-context.ts";
import {
  consolidateDeliveryCanvas,
} from "../../lib/delivery-canvas-orchestrator.ts";
import { withLogger } from "../../lib/logger.ts";

export const ConsolidateDeliveryFunction = DefineFunction({
  callback_id: "consolidate_delivery",
  title: "Consolidate Delivery Canvas Draft",
  source_file: "functions/consolidate_delivery/mod.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      canvas_id: { type: Schema.types.string },
      task_id: { type: Schema.types.string },
      status: { type: Schema.types.string },
      situation: { type: Schema.types.string },
      category: { type: Schema.types.string },
      requirements: { type: Schema.types.string },
      open_questions: { type: Schema.types.string },
      assignee: { type: Schema.slack.types.user_id },
      dashboard_canvas_content: { type: Schema.types.string },
    },
    required: [
      "channel_id",
      "user_id",
      "canvas_id",
      "task_id",
      "dashboard_canvas_content",
    ],
  },
  output_parameters: {
    properties: {
      draft_version: { type: Schema.types.number },
    },
    required: ["draft_version"],
  },
});

export default SlackFunction(
  ConsolidateDeliveryFunction,
  async ({ inputs, client, env }) => {
    return await withLogger(env, async (logger) => {
      const context = deserializeEventContext(inputs.dashboard_canvas_content);
      if (!context) {
        return { error: "Could not load channel context from dashboard." };
      }

      const markdown = await consolidateDeliveryCanvas(client, {
        channelId: inputs.channel_id,
        listId: (context as TesEventContext).deliverablesListId,
        context: context as TesEventContext,
        canvasId: inputs.canvas_id,
        row: {
          taskId: inputs.task_id,
          assigneeId: inputs.assignee,
          status: inputs.status ?? "Validation required",
          situation: inputs.situation ?? "",
          category: inputs.category ?? "Uncategorized",
          requirements: inputs.requirements ?? "",
          openQuestions: inputs.open_questions,
        },
        env: env as Record<string, string | undefined>,
      });

      const versionMatch = markdown.match(/Draft v(\d+)/);
      const draftVersion = versionMatch ? Number(versionMatch[1]) : 1;

      logger.emit("delivery.consolidate.completed", {
        canvasId: inputs.canvas_id,
        taskId: inputs.task_id,
        draftVersion,
      });

      return { outputs: { draft_version: draftVersion } };
    });
  },
);
