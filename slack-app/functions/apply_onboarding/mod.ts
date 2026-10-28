/**
 * Applies a submitted onboarding form: store write, Dashboard canvas render,
 * and the first-complete announcement.
 *
 * This runs as its own workflow step because the work exceeds the 3s Slack
 * allows for answering a view_submission.
 */
import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import type { OnboardingForm } from "@sea-trial/shared/types/index.ts";
import {
  executeOnboardingSubmit,
  type SlackOnboardingSubmitClient,
} from "../../lib/onboarding-view-submit.ts";

export const ApplyOnboardingFunction = DefineFunction({
  callback_id: "apply_onboarding",
  title: "Apply Onboarding",
  source_file: "functions/apply_onboarding/mod.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      snapshot: { type: Schema.types.string },
      form_json: { type: Schema.types.string },
    },
    required: ["channel_id", "snapshot", "form_json"],
  },
  output_parameters: { properties: {}, required: [] },
});

export const ONBOARDING_FORM_PARSE_ERROR =
  "Onboarding form could not be read. Run Complete onboarding again.";

export function parseOnboardingFormJson(
  formJson: string,
): OnboardingForm | undefined {
  try {
    const parsed = JSON.parse(formJson) as Partial<OnboardingForm> | null;
    if (!parsed || typeof parsed !== "object") return undefined;
    return {
      accountName: parsed.accountName ?? "",
      mainProspectGoal: parsed.mainProspectGoal ?? "",
      dealHistory: parsed.dealHistory ?? "",
      projectType: parsed.projectType ?? "",
      stakeholders: parsed.stakeholders ?? "",
      competitors: parsed.competitors ?? "",
      sailpointSuite: parsed.sailpointSuite ?? "",
      deadline: parsed.deadline ?? "",
      notes: parsed.notes ?? "",
    };
  } catch {
    return undefined;
  }
}

export interface ApplyOnboardingClient extends SlackOnboardingSubmitClient {
  chat: {
    postMessage: (
      params: { channel: string; text: string },
    ) => Promise<unknown>;
  };
}

/**
 * The modal has already closed by the time this runs, so failures are reported
 * in the channel rather than on a form field.
 */
export async function applyOnboarding(
  client: ApplyOnboardingClient,
  inputs: { channel_id: string; snapshot: string; form_json: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const form = parseOnboardingFormJson(inputs.form_json);
  if (!form) {
    await reportFailure(client, inputs.channel_id, ONBOARDING_FORM_PARSE_ERROR);
    return { ok: false, error: ONBOARDING_FORM_PARSE_ERROR };
  }

  const result = await executeOnboardingSubmit(
    client,
    {
      channel_id: inputs.channel_id,
      dashboard_canvas_content: inputs.snapshot,
    },
    form,
  );

  if (!result.ok) {
    await reportFailure(client, inputs.channel_id, result.error);
    return result;
  }

  return { ok: true };
}

async function reportFailure(
  client: ApplyOnboardingClient,
  channelId: string,
  error: string,
): Promise<void> {
  try {
    await client.chat.postMessage({
      channel: channelId,
      text: `⚠️ Onboarding was not saved: ${error}`,
    });
  } catch {
    // Reporting is best effort; the step still fails with the original error.
  }
}

export default SlackFunction(
  ApplyOnboardingFunction,
  async ({ inputs, client }) => {
    const result = await applyOnboarding(
      client as unknown as ApplyOnboardingClient,
      inputs,
    );

    if (!result.ok) {
      return { error: result.error };
    }

    return { outputs: {} };
  },
);
