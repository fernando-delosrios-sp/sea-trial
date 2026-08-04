import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import { getSupportedSuites } from "../../lib/suite-components.ts";

export const OpenOnboardingFunction = DefineFunction({
  callback_id: "open_onboarding",
  title: "Open Onboarding Modal",
  source_file: "functions/open_onboarding/mod.ts",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel_id: { type: Schema.slack.types.channel_id },
      dashboard_canvas_content: { type: Schema.types.string },
    },
    required: ["interactivity", "channel_id", "dashboard_canvas_content"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(
  OpenOnboardingFunction,
  async ({ inputs, client }) => {
    const suites = getSupportedSuites();

    await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: {
        type: "modal",
        callback_id: "submit_onboarding",
        private_metadata: JSON.stringify({
          channel_id: inputs.channel_id,
          dashboard_canvas_content: inputs.dashboard_canvas_content,
        }),
        title: { type: "plain_text", text: "TES Onboarding" },
        submit: { type: "plain_text", text: "Submit" },
        blocks: [
          {
            type: "input",
            block_id: "customer_name",
            label: { type: "plain_text", text: "Customer Name" },
            element: { type: "plain_text_input", action_id: "value" },
          },
          {
            type: "input",
            block_id: "main_prospect_goal",
            label: { type: "plain_text", text: "Main Prospect Goal" },
            element: { type: "plain_text_input", action_id: "value" },
          },
          {
            type: "input",
            block_id: "deal_history",
            label: { type: "plain_text", text: "Deal History" },
            element: { type: "plain_text_input", action_id: "value" },
          },
          {
            type: "input",
            block_id: "project_type",
            label: { type: "plain_text", text: "Project Type" },
            element: { type: "plain_text_input", action_id: "value" },
          },
          {
            type: "input",
            block_id: "stakeholders",
            label: { type: "plain_text", text: "Stakeholders" },
            element: { type: "plain_text_input", action_id: "value" },
          },
          {
            type: "input",
            block_id: "competitors",
            label: { type: "plain_text", text: "Competitors" },
            element: { type: "plain_text_input", action_id: "value" },
          },
          {
            type: "input",
            block_id: "sailpoint_suite",
            label: { type: "plain_text", text: "SailPoint Suite" },
            element: {
              type: "static_select",
              action_id: "value",
              options: suites.map((s) => ({
                text: { type: "plain_text", text: s },
                value: s,
              })),
            },
          },
          {
            type: "input",
            block_id: "deadline",
            label: { type: "plain_text", text: "Deadline" },
            element: { type: "plain_text_input", action_id: "value" },
          },
          {
            type: "input",
            block_id: "notes",
            label: { type: "plain_text", text: "Notes" },
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
);
