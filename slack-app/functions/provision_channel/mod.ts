import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import { buildInviteUserIds, validateChannelName } from "../../lib/channel.ts";

export const ProvisionChannelFunction = DefineFunction({
  callback_id: "provision_channel",
  title: "Provision TES Event Channel",
  source_file: "functions/provision_channel/mod.ts",
  input_parameters: {
    properties: {
      project_name: { type: Schema.types.string },
      member_user_ids: {
        type: Schema.types.array,
        items: { type: Schema.slack.types.user_id },
      },
      submitting_user_id: { type: Schema.slack.types.user_id },
      context_notes: { type: Schema.types.string },
    },
    required: [
      "project_name",
      "member_user_ids",
      "submitting_user_id",
    ],
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

    const inviteUserIds = buildInviteUserIds(
      inputs.member_user_ids,
      inputs.submitting_user_id,
    );

    await client.conversations.invite({
      channel: channelId,
      users: inviteUserIds.join(","),
    });

    return {
      outputs: {
        channel_id: channelId,
        channel_name: validation.channelName,
      },
    };
  },
);


