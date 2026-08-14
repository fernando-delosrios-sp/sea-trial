import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import {
  buildInviteUserIds,
  createTesEventChannel,
  validateChannelName,
} from "../../lib/channel.ts";

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
    if (!validation.valid) {
      return {
        error: validation.error ?? "Invalid project name",
      };
    }

    let channelId: string;
    let channelName: string;

    try {
      ({ channelId, channelName } = await createTesEventChannel(
        client,
        inputs.project_name,
      ));
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to create channel",
      };
    }

    const inviteUserIds = buildInviteUserIds(
      inputs.member_user_ids,
      inputs.submitting_user_id,
    );

    try {
      const inviteResult = await client.conversations.invite({
        channel: channelId,
        users: inviteUserIds.join(","),
      });

      if (
        inviteResult.ok === false &&
        inviteResult.error !== "already_in_channel"
      ) {
        return {
          error: `Channel created as #${channelName} but failed to invite members${
            inviteResult.error ? `: ${inviteResult.error}` : ""
          }`,
        };
      }
    } catch (error) {
      return {
        error: error instanceof Error
          ? error.message
          : `Channel created as #${channelName} but failed to invite members`,
      };
    }

    return {
      outputs: {
        channel_id: channelId,
        channel_name: channelName,
      },
    };
  },
);
