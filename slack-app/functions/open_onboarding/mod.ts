/**
 * Opens the onboarding modal from the TES Event Context Store using the
 * shortcut channel in view. Does not read Dashboard canvas markdown.
 *
 * Submitting only hands the captured form to the next workflow step: Slack
 * allows 3s to answer a view_submission, and the store write plus canvas
 * render take longer than that.
 */
import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import {
  buildOnboardingModalView,
  resolveAccountPrefill,
} from "../../lib/onboarding-modal.ts";
import { parseOnboardingForm } from "../../lib/onboarding-view-submit.ts";
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
  output_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      snapshot: { type: Schema.types.string },
      form_json: { type: Schema.types.string },
    },
    required: ["channel_id", "snapshot", "form_json"],
  },
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

/** Input block the modal shows submit failures under. */
export const ONBOARDING_SUBMIT_ERROR_BLOCK_ID = "account_name";

export interface OnboardingSubmitView {
  private_metadata?: string;
  state: { values: Record<string, Record<string, unknown>> };
}

export interface OnboardingCompletionClient {
  functions: {
    completeSuccess: (params: {
      function_execution_id: string;
      outputs: Record<string, unknown>;
    }) => Promise<unknown>;
  };
}

function parseOnboardingViewMetadata(
  privateMetadata: string | undefined,
): { channel_id: string; dashboard_canvas_content: string } | undefined {
  if (!privateMetadata) return undefined;
  try {
    const parsed = JSON.parse(privateMetadata) as {
      channel_id?: string;
      dashboard_canvas_content?: string;
    };
    if (!parsed.channel_id) return undefined;
    return {
      channel_id: parsed.channel_id,
      dashboard_canvas_content: parsed.dashboard_canvas_content ?? "",
    };
  } catch {
    return undefined;
  }
}

function submitFailure(message: string): Record<string, unknown> {
  return {
    response_action: "errors",
    errors: { [ONBOARDING_SUBMIT_ERROR_BLOCK_ID]: message },
  };
}

/**
 * Completes the open step with the captured form so the modal closes well
 * inside Slack's 3s view_submission budget. The Apply Onboarding step does the
 * store write, canvas render, and announcement.
 */
export async function submitOnboardingView(
  client: OnboardingCompletionClient,
  view: OnboardingSubmitView,
  functionExecutionId: string | undefined,
): Promise<Record<string, unknown>> {
  const metadata = parseOnboardingViewMetadata(view.private_metadata);
  if (!metadata) {
    return submitFailure(
      "Missing onboarding metadata. Close this modal and run Complete onboarding again.",
    );
  }

  if (!functionExecutionId) {
    return submitFailure(
      "Slack did not supply a function execution id for this submission. Close this modal and run Complete onboarding again.",
    );
  }

  await client.functions.completeSuccess({
    function_execution_id: functionExecutionId,
    outputs: {
      channel_id: metadata.channel_id,
      snapshot: metadata.dashboard_canvas_content,
      form_json: JSON.stringify(parseOnboardingForm(view.state.values)),
    },
  });

  return {};
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

    const opened = await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: buildOnboardingModalView({
        channelId: inputs.channel_id,
        dashboardCanvasContent,
        accountName,
      }),
    }) as { ok?: boolean; error?: string };

    if (!opened?.ok) {
      return {
        error:
          `Could not open the onboarding modal (${opened?.error ?? "unknown"}).`,
      };
    }

    return { completed: false };
  },
).addViewSubmissionHandler(
  "submit_onboarding",
  async ({ view, body, client }) => {
    const startedAt = Date.now();
    try {
      const response = await submitOnboardingView(
        client as unknown as OnboardingCompletionClient,
        view as unknown as OnboardingSubmitView,
        body?.function_data?.execution_id,
      );
      console.log(
        `[submit_onboarding] completed in ${Date.now() - startedAt}ms`,
      );
      return response;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.log(
        `[submit_onboarding] failed after ${Date.now() - startedAt}ms: ${detail}`,
      );
      return submitFailure(`Onboarding submit failed: ${detail}`);
    }
  },
);
