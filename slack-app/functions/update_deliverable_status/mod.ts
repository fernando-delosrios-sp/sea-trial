import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { deserializeEventContext } from "../../lib/event-context.ts";
import { updateDeliverableStatus } from "../../lib/deliverables-list-update.ts";
import { withLogger } from "../../lib/logger.ts";

export const UpdateDeliverableStatusFunction = DefineFunction({
  callback_id: "update_deliverable_status",
  title: "Update Deliverable Status",
  source_file: "functions/update_deliverable_status/mod.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      deliverables_list_id: { type: Schema.types.string },
      list_item_id: { type: Schema.types.string },
      task_id: { type: Schema.types.string },
      new_status: { type: Schema.types.string },
      previous_status: { type: Schema.types.string },
      situation: { type: Schema.types.string },
      category: { type: Schema.types.string },
      requirements: { type: Schema.types.string },
      open_questions: { type: Schema.types.string },
      deliverable: { type: Schema.types.string },
      assignee: { type: Schema.slack.types.user_id },
      dashboard_canvas_content: { type: Schema.types.string },
    },
    required: [
      "channel_id",
      "user_id",
      "deliverables_list_id",
      "list_item_id",
      "task_id",
      "new_status",
      "dashboard_canvas_content",
    ],
  },
  output_parameters: {
    properties: {
      canvas_id: { type: Schema.types.string },
      canvas_created: { type: Schema.types.boolean },
    },
    required: ["canvas_id", "canvas_created"],
  },
});

export default SlackFunction(
  UpdateDeliverableStatusFunction,
  async ({ inputs, client, env }) => {
    return await withLogger(env, async (logger) => {
      const context = deserializeEventContext(inputs.dashboard_canvas_content);
      if (!context) {
        return { error: "Could not load channel context from dashboard." };
      }

      const result = await updateDeliverableStatus({
        client: client as Parameters<typeof updateDeliverableStatus>[0]["client"],
        channelId: inputs.channel_id,
        listId: inputs.deliverables_list_id,
        listItemId: inputs.list_item_id,
        context: context as TesEventContext,
        row: {
          taskId: inputs.task_id,
          assigneeId: inputs.assignee,
          status: inputs.previous_status ?? "Not started",
          situation: inputs.situation ?? "",
          category: inputs.category ?? "Uncategorized",
          requirements: inputs.requirements ?? "",
          openQuestions: inputs.open_questions,
          deliverableUrl: inputs.deliverable,
        },
        newStatus: inputs.new_status,
        env: env as Record<string, string | undefined>,
      });

      logger.emit("deliverables.status_updated", {
        taskId: inputs.task_id,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        canvasCreated: result.canvasResult?.created ?? false,
      });

      return {
        outputs: {
          canvas_id: result.canvasResult?.canvasId ?? "",
          canvas_created: result.canvasResult?.created ?? false,
        },
      };
    });
  },
);
