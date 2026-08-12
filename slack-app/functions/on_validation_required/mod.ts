import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import type { TesEventContext } from "@tes/shared/types/index.ts";
import { deserializeEventContext } from "../../lib/event-context.ts";
import {
  runValidationRequiredIfNeeded,
  type DeliverableListItemSnapshot,
} from "../../lib/deliverables-list-update.ts";
import { withLogger } from "../../lib/logger.ts";

export const OnValidationRequiredFunction = DefineFunction({
  callback_id: "on_validation_required",
  title: "Create Delivery Canvas on Validation Required",
  source_file: "functions/on_validation_required/mod.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      deliverables_list_id: { type: Schema.types.string },
      list_item_id: { type: Schema.types.string },
      task_id: { type: Schema.types.string },
      status: { type: Schema.types.string },
      situation: { type: Schema.types.string },
      category: { type: Schema.types.string },
      requirements: { type: Schema.types.string },
      open_questions: { type: Schema.types.string },
      deliverable: { type: Schema.types.string },
      assignee: { type: Schema.slack.types.user_id },
      previous_status: { type: Schema.types.string },
      dashboard_canvas_content: { type: Schema.types.string },
    },
    required: [
      "channel_id",
      "user_id",
      "deliverables_list_id",
      "task_id",
      "status",
      "dashboard_canvas_content",
    ],
  },
  output_parameters: {
    properties: {
      canvas_id: { type: Schema.types.string },
      created: { type: Schema.types.boolean },
    },
    required: ["canvas_id", "created"],
  },
});

function buildRow(inputs: {
  task_id: string;
  assignee?: string;
  status: string;
  situation?: string;
  category?: string;
  requirements?: string;
  open_questions?: string;
  deliverable?: string;
}): DeliverableListItemSnapshot {
  return {
    taskId: inputs.task_id,
    assigneeId: inputs.assignee,
    status: inputs.status,
    situation: inputs.situation ?? "New",
    category: inputs.category ?? "Uncategorized",
    requirements: inputs.requirements ?? "",
    openQuestions: inputs.open_questions,
    deliverableUrl: inputs.deliverable,
  };
}

export default SlackFunction(
  OnValidationRequiredFunction,
  async ({ inputs, client, env }) => {
    return await withLogger(env, async (logger) => {
      const context = deserializeEventContext(inputs.dashboard_canvas_content);
      if (!context) {
        return { error: "Could not load channel context from dashboard." };
      }

      const row = buildRow(inputs);
      const result = await runValidationRequiredIfNeeded(
        {
          listName: "deliverables",
          column: "status",
          previousValue: inputs.previous_status ?? "",
          newValue: inputs.status,
          row,
        },
        {
          client,
          channelId: inputs.channel_id,
          listId: inputs.deliverables_list_id,
          listItemId: inputs.list_item_id,
          context: context as TesEventContext,
          row,
          env: env as Record<string, string | undefined>,
        },
      );

      if (!result) {
        return { outputs: { canvas_id: "", created: false } };
      }

      logger.emit("delivery.validation_required.completed", {
        taskId: inputs.task_id,
        canvasId: result.canvasId,
        created: result.created,
      });

      return {
        outputs: {
          canvas_id: result.canvasId,
          created: result.created,
        },
      };
    });
  },
);
