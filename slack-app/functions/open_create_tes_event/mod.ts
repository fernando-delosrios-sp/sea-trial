import {
  DefineFunction,
  Schema,
  SlackFunction,
} from "@slack/deno-slack-sdk/mod.ts";
import { buildCreateTesEventModalView } from "../../lib/content/modal-compiler.ts";
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
      view: buildCreateTesEventModalView(),
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

