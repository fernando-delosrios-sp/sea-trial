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
import { readCanvasMarkdown, type CanvasSectionsClient } from "../../lib/canvas.ts";

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

async function resolveDashboardCanvasContent(
  client: CanvasSectionsClient,
  inputs: {
    dashboard_canvas_content?: string;
    dashboard_canvas_id?: string;
  },
): Promise<string> {
  const inline = inputs.dashboard_canvas_content?.trim() ?? "";
  if (inline) return inline;

  const dashboardCanvasId = inputs.dashboard_canvas_id?.trim();
  if (!dashboardCanvasId) return "";

  try {
    return await readCanvasMarkdown(client, dashboardCanvasId);
  } catch {
    return "";
  }
}

export default SlackFunction(
  OpenOnboardingFunction,
  async ({ inputs, client }) => {
    const dashboardCanvasContent = await resolveDashboardCanvasContent(
      client as unknown as CanvasSectionsClient,
      inputs,
    );
    if (!dashboardCanvasContent) {
      const triedCanvasId = Boolean(inputs.dashboard_canvas_id?.trim());
      return {
        error: triedCanvasId
          ? "Could not read the dashboard canvas. Use the Complete onboarding button on the pinned index message."
          : "Dashboard content is unavailable. Use the Complete onboarding button on the pinned index message.",
      };
    }

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

    const dashboardCanvasContent = await loadDashboardContentForButton(
      client as unknown as CanvasSectionsClient,
      typeof action.value === "string" ? action.value : undefined,
      "",
    );
    if (!dashboardCanvasContent) {
      return { error: "Could not load dashboard canvas for onboarding." };
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

    let dashboardCanvasContent = metadata.dashboard_canvas_content?.trim() ?? "";
    if (!dashboardCanvasContent) {
      const dashboardCanvasId = metadata.dashboard_canvas_id?.trim();
      if (!dashboardCanvasId) {
        return { error: "Missing dashboard canvas reference in onboarding metadata." };
      }

      try {
        dashboardCanvasContent = await readCanvasMarkdown(
          client as unknown as CanvasSectionsClient,
          dashboardCanvasId,
        );
      } catch {
        return {
          error:
            "Could not load dashboard canvas. Try opening onboarding from the pinned index button.",
        };
      }
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

