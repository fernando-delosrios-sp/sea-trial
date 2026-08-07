import {
  DefineFunction,
  Schema,
  SlackFunction,
} from "@slack/deno-slack-sdk/mod.ts";
import { parseCreateTesEventSubmission } from "../../lib/create-tes-event-submit.ts";
import type { ViewStateValues } from "../../lib/create-tes-event-submit.ts";

export const OpenCreateTesEventFunction = DefineFunction({
  callback_id: "open_create_tes_event",
  title: "Open Create TES Event Modal",
  source_file: "functions/open_create_tes_event/mod.ts",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
    },
    required: ["interactivity"],
  },
  output_parameters: {
    properties: {
      project_name: { type: Schema.types.string },
      account_name: { type: Schema.types.string },
      salesforce_opportunity_url: { type: Schema.types.string },
      member_user_ids: {
        type: Schema.types.array,
        items: { type: Schema.slack.types.user_id },
      },
      context_notes: { type: Schema.types.string },
      submitting_user_id: { type: Schema.slack.types.user_id },
    },
    required: [
      "project_name",
      "account_name",
      "salesforce_opportunity_url",
      "member_user_ids",
      "submitting_user_id",
    ],
  },
});

export default SlackFunction(
  OpenCreateTesEventFunction,
  async ({ inputs, client }) => {
    await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: {
        type: "modal",
        callback_id: "submit_create_tes_event",
        title: { type: "plain_text", text: "Create TES Event" },
        submit: { type: "plain_text", text: "Create" },
        blocks: [
          {
            type: "input",
            block_id: "project_name",
            label: { type: "plain_text", text: "Project Name" },
            element: { type: "plain_text_input", action_id: "value" },
          },
          {
            type: "input",
            block_id: "account",
            label: { type: "plain_text", text: "Account" },
            element: { type: "plain_text_input", action_id: "value" },
          },
          {
            type: "input",
            block_id: "salesforce_url",
            label: { type: "plain_text", text: "Salesforce Opportunity URL" },
            element: { type: "plain_text_input", action_id: "value" },
          },
          {
            type: "input",
            block_id: "members",
            label: { type: "plain_text", text: "Members" },
            element: { type: "multi_users_select", action_id: "value" },
          },
          {
            type: "input",
            block_id: "context_notes",
            label: { type: "plain_text", text: "Context Notes" },
            optional: true,
            element: {
              type: "plain_text_input",
              action_id: "value",
              multiline: true,
            },
          },
        ],
      },
    });

    return { completed: false };
  },
).addViewSubmissionHandler(
  "submit_create_tes_event",
  async ({ view, body, client }) => {
    const result = parseCreateTesEventSubmission(
      view.state.values as ViewStateValues,
    );

    if (!result.valid) {
      return { response_action: "errors", errors: result.errors };
    }

    await client.functions.completeSuccess({
      function_execution_id: body.function_data.execution_id,
      outputs: {
        project_name: result.data.projectName,
        account_name: result.data.accountName,
        salesforce_opportunity_url: result.data.salesforceOpportunityUrl,
        member_user_ids: result.data.memberUserIds,
        context_notes: result.data.contextNotes,
        submitting_user_id: body.user.id,
      },
    });

    return {};
  },
);
