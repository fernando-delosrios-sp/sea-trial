import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import {
  provisionChannel,
  serializeProvisionedContext,
} from "../../lib/content/channel-provisioner.ts";

export const SeedChannelObjectsFunction = DefineFunction({
  callback_id: "seed_channel_objects",
  title: "Seed TES Event Channel Objects",
  source_file: "functions/seed_channel_objects/mod.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      project_name: { type: Schema.types.string },
      account_name: { type: Schema.types.string },
      salesforce_opportunity_url: { type: Schema.types.string },
      member_user_ids: {
        type: Schema.types.array,
        items: { type: Schema.slack.types.user_id },
      },
      context_notes: { type: Schema.types.string },
    },
    required: ["channel_id", "project_name"],
  },
  output_parameters: {
    properties: {
      context_json: { type: Schema.types.string },
    },
    required: ["context_json"],
  },
});

export default SlackFunction(
  SeedChannelObjectsFunction,
  async ({ inputs, client, env }) => {
    const context = await provisionChannel(client, {
      channel_id: inputs.channel_id,
      project_name: inputs.project_name,
      account_name: inputs.account_name,
      salesforce_opportunity_url: inputs.salesforce_opportunity_url,
      member_user_ids: inputs.member_user_ids,
      context_notes: inputs.context_notes,
      env: env as Record<string, string | undefined>,
    });

    return {
      outputs: {
        context_json: serializeProvisionedContext(context),
      },
    };
  },
);
