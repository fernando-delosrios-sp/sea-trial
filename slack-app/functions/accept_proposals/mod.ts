import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import type { DeliverableProposal } from "@tes/shared/types/index.ts";
import { replaceCanvasContent } from "../../lib/canvas.ts";
import {
  processAcceptProposals,
  resolveReviewAction,
  reviewActionMessage,
  shouldWriteToList,
} from "../../lib/review-gate.ts";
import { withLogger } from "../../lib/logger.ts";

export const AcceptProposalsFunction = DefineFunction({
  callback_id: "accept_proposals",
  title: "Accept Deliverable Proposals",
  source_file: "functions/accept_proposals/mod.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      action: { type: Schema.types.string },
      proposals_json: { type: Schema.types.string },
      deliverables_list_id: { type: Schema.types.string },
      requirements_canvas_id: { type: Schema.types.string },
      requirements_canvas_content: { type: Schema.types.string },
    },
    required: [
      "channel_id",
      "user_id",
      "action",
      "proposals_json",
      "deliverables_list_id",
      "requirements_canvas_id",
      "requirements_canvas_content",
    ],
  },
  output_parameters: {
    properties: {
      accepted_count: { type: Schema.types.number },
    },
    required: ["accepted_count"],
  },
});

export default SlackFunction(
  AcceptProposalsFunction,
  async ({ inputs, client, env }) => {
    return await withLogger(env, async (logger) => {
      const action = resolveReviewAction(inputs.action);
      const proposals = JSON.parse(inputs.proposals_json) as DeliverableProposal[];

      logger.emit("accept.started", {
        channelId: inputs.channel_id,
        action,
        proposalCount: proposals.length,
      });

      if (!shouldWriteToList(action)) {
        await client.chat.postMessage({
          channel: inputs.channel_id,
          text: reviewActionMessage(action, 0),
        });
        return { outputs: { accepted_count: 0 } };
      }

      const result = processAcceptProposals(
        proposals,
        inputs.requirements_canvas_content,
        inputs.user_id,
      );

      for (const row of result.rows) {
        await client.slackLists.items.create({
          list_id: inputs.deliverables_list_id,
          initial_fields: [
            { column_id: "task_id", value: row.taskId },
            { column_id: "assignee", value: row.assignee },
            { column_id: "status", value: row.status },
            { column_id: "situation", value: row.situation },
            { column_id: "category", value: row.category },
            { column_id: "requirements", value: row.requirements },
            { column_id: "deliverable", value: row.deliverable },
            { column_id: "open_questions", value: row.openQuestions },
          ],
        });
      }

      await replaceCanvasContent(
        client,
        inputs.requirements_canvas_id,
        result.updatedCanvasMarkdown,
      );

      await client.chat.postMessage({
        channel: inputs.channel_id,
        text: reviewActionMessage(action, proposals.length),
      });

      logger.emit("accept.completed", {
        channelId: inputs.channel_id,
        acceptedCount: proposals.length,
      });

      return { outputs: { accepted_count: proposals.length } };
    });
  },
);
