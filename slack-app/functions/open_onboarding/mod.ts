/**
 * Opens and submits onboarding from a seed-time trigger context snapshot
 * (workflow input `dashboard_canvas_content` or pinned button value).
 * Does not read Dashboard canvas markdown.
 */
import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import {
  buildOnboardingModalView,
  resolveAccountPrefill,
} from "../../lib/onboarding-modal.ts";
import {
  executeOnboardingSubmit,
  loadDashboardContentForButton,
  parseOnboardingForm,
  type SlackOnboardingSubmitClient,
} from "../../lib/onboarding-view-submit.ts";
import {
  deserializeEventContext,
  MISSING_ONBOARDING_SNAPSHOT_ERROR,
} from "../../lib/event-context.ts";

export const OpenOnboardingFunction = DefineFunction({
  callback_id: "open_onboarding",
  title: "Open Onboarding Modal",
  source_file: "functions/open_onboarding/mod.ts",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel_id: { type: Schema.slack.types.channel_id },
      dashboard_canvas_content: { type: Schema.types.string },
      dashboard_canvas_id: { type: Schema.types.string },
    },
    required: ["interactivity", "channel_id"],
  },
  output_parameters: { properties: {}, required: [] },
});

export function resolveDashboardCanvasContent(
  _client: unknown,
  inputs: {
    dashboard_canvas_content?: string;
    dashboard_canvas_id?: string;
  },
): string {
  const snapshot = inputs.dashboard_canvas_content?.trim() ?? "";
  if (deserializeEventContext(snapshot)) return snapshot;
  return "";
}

export function requireOnboardingSnapshot(
  inputs: {
    dashboard_canvas_content?: string;
    dashboard_canvas_id?: string;
  },
): { ok: true; snapshot: string } | { ok: false; error: string } {
  const snapshot = resolveDashboardCanvasContent(undefined, inputs);
  if (!snapshot) {
    return { ok: false, error: MISSING_ONBOARDING_SNAPSHOT_ERROR };
  }
  return { ok: true, snapshot };
}

export default SlackFunction(
  OpenOnboardingFunction,
  async ({ inputs, client }) => {
    const required = requireOnboardingSnapshot(inputs);
    if (!required.ok) {
      return { error: required.error };
    }
    const dashboardCanvasContent = required.snapshot;

    const accountName = resolveAccountPrefill(dashboardCanvasContent);

    await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: buildOnboardingModalView({
        channelId: inputs.channel_id,
        dashboardCanvasContent,
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

    const buttonValue = typeof action.value === "string"
      ? action.value
      : action.value != null
      ? JSON.stringify(action.value)
      : undefined;
    const dashboardCanvasContent = loadDashboardContentForButton(
      buttonValue,
      "",
    );
    if (!dashboardCanvasContent) {
      return { error: MISSING_ONBOARDING_SNAPSHOT_ERROR };
    }

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
    if (!view.private_metadata) {
      return { error: "Missing onboarding metadata." };
    }

    const metadata = JSON.parse(view.private_metadata) as {
      channel_id: string;
      dashboard_canvas_id?: string;
      dashboard_canvas_content?: string;
    };

    const dashboardCanvasContent = metadata.dashboard_canvas_content?.trim() ?? "";
    if (!deserializeEventContext(dashboardCanvasContent)) {
      return { error: MISSING_ONBOARDING_SNAPSHOT_ERROR };
    }

    const result = await executeOnboardingSubmit(
      client as unknown as SlackOnboardingSubmitClient,
      {
        channel_id: metadata.channel_id,
        dashboard_canvas_content: dashboardCanvasContent,
      },
      parseOnboardingForm(view.state.values),
    );

    if (!result.ok) {
      return { error: result.error };
    }

    return { completed: true };
  },
);
