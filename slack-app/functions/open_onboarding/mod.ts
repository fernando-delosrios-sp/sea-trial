import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import {
  buildOnboardingModalView,
  resolveAccountPrefill,
} from "../../lib/onboarding-modal.ts";
import {
  executeOnboardingSubmit,
  loadDashboardContentForButton,
  parseOnboardingForm,
} from "../../lib/onboarding-view-submit.ts";

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
    const accountName = resolveAccountPrefill(inputs.dashboard_canvas_content);

    await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: buildOnboardingModalView({
        channelId: inputs.channel_id,
        dashboardCanvasContent: inputs.dashboard_canvas_content,
        accountName,
      }),
    });

    return { completed: false };
  },
).addBlockActionsHandler(
  "complete_onboarding",
  async ({ action, body, client }) => {
    const channelId = body.channel?.id;
    if (!channelId) {
      return { error: "Missing channel context for onboarding button." };
    }

    const dashboardCanvasContent = await loadDashboardContentForButton(
      client,
      typeof action.value === "string" ? action.value : undefined,
      "",
    );

    const accountName = resolveAccountPrefill(dashboardCanvasContent);

    await client.views.open({
      interactivity_pointer: body.interactivity.interactivity_pointer,
      view: buildOnboardingModalView({
        channelId,
        dashboardCanvasContent,
        accountName,
      }),
    });

    return { completed: true };
  },
).addViewSubmissionHandler(
  "submit_onboarding",
  async ({ view, client }) => {
    const metadata = JSON.parse(view.private_metadata) as {
      channel_id: string;
      dashboard_canvas_content: string;
    };

    const result = await executeOnboardingSubmit(
      client,
      metadata,
      parseOnboardingForm(view.state.values),
    );

    if (!result.ok) {
      return { error: result.error };
    }

    return { completed: true };
  },
);
