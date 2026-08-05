import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import { validateChannelName } from "../../lib/channel.ts";

export const ProvisionChannelFunction = DefineFunction({
  callback_id: "provision_channel",
  title: "Provision TES Event Channel",
  source_file: "functions/provision_channel/mod.ts",
  input_parameters: {
    properties: {
      project_name: { type: Schema.types.string },
      ae_user_id: { type: Schema.slack.types.user_id },
      se_user_id: { type: Schema.slack.types.user_id },
      context_notes: { type: Schema.types.string },
      interactivity: { type: Schema.slack.types.interactivity },
    },
    required: ["project_name", "ae_user_id", "se_user_id", "interactivity"],
  },
  output_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      channel_name: { type: Schema.types.string },
    },
    required: ["channel_id", "channel_name"],
  },
});

export default SlackFunction(
  ProvisionChannelFunction,
  async ({ inputs, client }) => {
    const validation = validateChannelName(inputs.project_name);
    if (!validation.valid || !validation.channelName) {
      return {
        error: validation.error ?? "Invalid project name",
      };
    }

    const createResult = await client.conversations.create({
      name: validation.channelName,
      is_private: false,
    });

    if (!createResult.ok || !createResult.channel?.id) {
      return { error: createResult.error ?? "Failed to create channel" };
    }

    const channelId = createResult.channel.id;

    await client.conversations.invite({
      channel: channelId,
      users: [inputs.ae_user_id, inputs.se_user_id].join(","),
    });

    return {
      outputs: {
        channel_id: channelId,
        channel_name: validation.channelName,
      },
    };
  },
);
