import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import { readCanvasMarkdown } from "../../lib/canvas.ts";
import {
  loadContextFromDashboardMarkdown,
  runPublishSituationReport,
} from "../../lib/publish-situation-report-handler.ts";

export const PublishSituationReportFunction = DefineFunction({
  callback_id: "publish_situation_report",
  title: "Publish Situation Report",
  source_file: "functions/publish_situation_report/mod.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      dashboard_canvas_content: { type: Schema.types.string },
    },
    required: ["channel_id", "dashboard_canvas_content"],
  },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(
  PublishSituationReportFunction,
  async ({ inputs, client }) => {
    const context = loadContextFromDashboardMarkdown(
      inputs.dashboard_canvas_content,
    );
    if (!context) {
      return { error: "Could not load channel context from dashboard." };
    }

    const result = await runPublishSituationReport(client, context);
    if (!result.ok) {
      return { error: result.error ?? "Publish failed." };
    }

    return { completed: true };
  },
).addBlockActionsHandler(
  "publish_situation_report",
  async ({ action, body, client }) => {
    const channelId = body.channel?.id;
    if (!channelId) {
      return { error: "Missing channel context for publish button." };
    }

    let dashboardMarkdown = "";
    if (typeof action.value === "string" && action.value.trim()) {
      try {
        const payload = JSON.parse(action.value) as {
          dashboard_canvas_id?: string;
        };
        if (payload.dashboard_canvas_id) {
          dashboardMarkdown = await readCanvasMarkdown(
            client,
            payload.dashboard_canvas_id,
          );
        }
      } catch {
        return { error: "Invalid publish button payload." };
      }
    }

    const context = loadContextFromDashboardMarkdown(dashboardMarkdown);
    if (!context) {
      return { error: "Could not load channel context from dashboard." };
    }

    const result = await runPublishSituationReport(client, context);
    if (!result.ok) {
      return { error: result.error ?? "Publish failed." };
    }

    return { completed: true };
  },
);
