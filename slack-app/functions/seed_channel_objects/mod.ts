import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import type { TesEventContext } from "@tes/shared/types/index.ts";
import { createCanvas, replaceCanvasContent } from "../../lib/canvas.ts";
import {
  createDeliverablesList,
  createIncidentsList,
} from "../../lib/lists.ts";
import { serializeEventContext } from "../../lib/event-context.ts";
import {
  dashboardTemplate,
  infrastructureTemplate,
  pinnedIndexBlocks,
  pinnedIndexMessage,
  requirementsTemplate,
} from "../../templates/index.ts";

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
  async ({ inputs, client }) => {
    const requirementsId = await createCanvas(client, {
      channelId: inputs.channel_id,
      title: "Requirements",
      content: requirementsTemplate(),
    });

    const infrastructureId = await createCanvas(client, {
      channelId: inputs.channel_id,
      title: "Infrastructure",
      content: infrastructureTemplate(),
    });

    const deliverablesListId = await createDeliverablesList(
      client,
      inputs.channel_id,
    );
    const incidentsListId = await createIncidentsList(
      client,
      inputs.channel_id,
    );

    const context: TesEventContext = {
      channelId: inputs.channel_id,
      projectName: inputs.project_name,
      onboardingComplete: false,
      derivedComponents: [],
      dashboardCanvasId: "",
      requirementsCanvasId: requirementsId,
      deliverablesListId,
      incidentsListId,
      infrastructureCanvasId: infrastructureId,
      accountName: inputs.account_name,
      salesforceOpportunityUrl: inputs.salesforce_opportunity_url,
      memberUserIds: inputs.member_user_ids,
      contextNotes: inputs.context_notes,
    };

    const dashboardId = await createCanvas(client, {
      channelId: inputs.channel_id,
      title: "Dashboard",
      content: dashboardTemplate(context),
    });

    context.dashboardCanvasId = dashboardId;

    await replaceCanvasContent(
      client,
      dashboardId,
      dashboardTemplate(context),
    );

    const indexMessage = await client.chat.postMessage({
      channel: inputs.channel_id,
      text: pinnedIndexMessage(context),
      blocks: pinnedIndexBlocks(context),
    });

    if (indexMessage.ts) {
      await client.pins.add({
        channel: inputs.channel_id,
        timestamp: indexMessage.ts,
      });
    }

    return {
      outputs: {
        context_json: serializeEventContext(context),
      },
    };
  },
);

