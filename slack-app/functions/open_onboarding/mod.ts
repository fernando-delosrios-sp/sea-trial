/**
 * Opens and submits onboarding from the TES Event Context Store using the
 * shortcut channel in view. Does not read Dashboard canvas markdown.
 */
import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import {
  buildOnboardingModalView,
  resolveAccountPrefill,
} from "../../lib/onboarding-modal.ts";
import {
  executeOnboardingSubmit,
  parseOnboardingForm,
  type SlackOnboardingSubmitClient,
} from "../../lib/onboarding-view-submit.ts";
import { serializeEventContextSnapshot } from "../../lib/event-context.ts";
import {
  getTesEventContext,
  TES_EVENT_CONTEXT_STORE_MISS_ERROR,
  type TesEventContextStoreClient,
} from "../../lib/tes-event-context-store.ts";

export const OpenOnboardingFunction = DefineFunction({
  callback_id: "open_onboarding",
  title: "Open Onboarding Modal",
  source_file: "functions/open_onboarding/mod.ts",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel_id: { type: Schema.slack.types.channel_id },
    },
    required: ["interactivity", "channel_id"],
  },
  output_parameters: { properties: {}, required: [] },
});

export async function loadOnboardingContextFromStore(
  client: TesEventContextStoreClient,
  channelId: string,
): Promise<{ ok: true; snapshot: string } | { ok: false; error: string }> {
  try {
    const context = await getTesEventContext(client, channelId);
    if (!context) {
      return { ok: false, error: TES_EVENT_CONTEXT_STORE_MISS_ERROR };
    }
    return { ok: true, snapshot: serializeEventContextSnapshot(context) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default SlackFunction(
  OpenOnboardingFunction,
  async ({ inputs, client }) => {
    const required = await loadOnboardingContextFromStore(
      client as unknown as TesEventContextStoreClient,
      inputs.channel_id,
    );
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

    const result = await executeOnboardingSubmit(
      client as unknown as SlackOnboardingSubmitClient,
      {
        channel_id: metadata.channel_id,
        dashboard_canvas_content: metadata.dashboard_canvas_content ?? "",
      },
      parseOnboardingForm(view.state.values),
    );

    if (!result.ok) {
      return { error: result.error };
    }

    return { completed: true };
  },
);
