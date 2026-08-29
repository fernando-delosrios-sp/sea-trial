import type { OnboardingForm } from "@sea-trial/shared/types/index.ts";
import {
  deserializeEventContext,
  MISSING_ONBOARDING_SNAPSHOT_ERROR,
} from "./event-context.ts";
import { processOnboardingSubmit } from "./onboarding-submit.ts";
import { replaceCanvasContent, type CanvasSectionsClient } from "./canvas.ts";
import { renderDashboardCanvasForSlack, type CanvasAssetUploadClient } from "./content/canvas-assets.ts";

export function getInputValue(
  state: Record<string, Record<string, unknown>>,
  blockId: string,
): string {
  const block = state[blockId];
  if (!block) return "";
  const value = block.value;
  if (typeof value === "string") return value;
  const selected = block.value as { selected_option?: { value: string } };
  return selected?.selected_option?.value ?? "";
}

export function parseOnboardingForm(
  values: Record<string, Record<string, unknown>>,
): OnboardingForm {
  return {
    accountName: getInputValue(values, "account_name"),
    mainProspectGoal: getInputValue(values, "main_prospect_goal"),
    dealHistory: getInputValue(values, "deal_history"),
    projectType: getInputValue(values, "project_type"),
    stakeholders: getInputValue(values, "stakeholders"),
    competitors: getInputValue(values, "competitors"),
    sailpointSuite: getInputValue(values, "sailpoint_suite"),
    deadline: getInputValue(values, "deadline"),
    notes: getInputValue(values, "notes"),
  };
}

export interface OnboardingViewMetadata {
  channel_id: string;
  dashboard_canvas_content: string;
}

export interface SlackOnboardingSubmitClient
  extends CanvasSectionsClient, CanvasAssetUploadClient {
  chat: {
    postMessage: (params: { channel: string; text: string }) => Promise<unknown>;
  };
  canvases: CanvasSectionsClient["canvases"] & {
    edit: (params: {
      canvas_id: string;
      changes: Array<{
        operation: string;
        document_content?: { type: string; markdown: string };
      }>;
    }) => Promise<unknown>;
  };
}

/**
 * Processes an onboarding modal submission: updates context, dashboard, and posts confirmation.
 * Uses the trigger context snapshot in private metadata — does not read canvas markdown.
 */
export async function executeOnboardingSubmit(
  client: SlackOnboardingSubmitClient,
  metadata: OnboardingViewMetadata,
  form: OnboardingForm,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existingContext = deserializeEventContext(
    metadata.dashboard_canvas_content,
  );

  if (!existingContext) {
    return {
      ok: false,
      error: MISSING_ONBOARDING_SNAPSHOT_ERROR,
    };
  }

  const { context } = processOnboardingSubmit(
    existingContext,
    form,
  );

  const dashboardContent = await renderDashboardCanvasForSlack(
    client,
    metadata.channel_id,
    context,
    form,
  );

  await replaceCanvasContent(
    client,
    context.dashboardCanvasId,
    dashboardContent,
  );

  await client.chat.postMessage({
    channel: metadata.channel_id,
    text:
      "✅ Onboarding complete! @mention the bot with your requirement documents to summon the Requirements Agent.",
  });

  return { ok: true };
}

/**
 * Loads the trigger context snapshot from the pinned index Complete onboarding button.
 * Does not read Dashboard canvas markdown.
 */
export function loadDashboardContentForButton(
  buttonValue: string | undefined,
  fallbackContent: string,
): string {
  if (!buttonValue) {
    return deserializeEventContext(fallbackContent) ? fallbackContent : "";
  }

  try {
    const parsed = JSON.parse(buttonValue) as {
      dashboard_canvas_id?: string;
      dashboard_canvas_content?: string;
    };
    const snapshot = parsed.dashboard_canvas_content?.trim();
    if (snapshot && deserializeEventContext(snapshot)) return snapshot;
  } catch {
    // Invalid button JSON is treated as a missing snapshot.
  }

  return deserializeEventContext(fallbackContent) ? fallbackContent : "";
}
