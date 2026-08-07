import {
  DefineFunction,
  Schema,
  SlackFunction,
} from "@slack/deno-slack-sdk/mod.ts";

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
  output_parameters: { properties: {}, required: [] },
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
);
