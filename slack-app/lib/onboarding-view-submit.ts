import type { OnboardingForm } from "@sea-trial/shared/types/index.ts";
import {
  deserializeEventContext,
  MISSING_ONBOARDING_SNAPSHOT_ERROR,
} from "./event-context.ts";
import { processOnboardingSubmit } from "./onboarding-submit.ts";
import { replaceCanvasContent, type CanvasSectionsClient } from "./canvas.ts";
import { richTextValueToText } from "./content/rich-text.ts";
import { renderDashboardCanvasForSlack, type CanvasAssetUploadClient } from "./content/canvas-assets.ts";
import { renderRequirementsCanvas } from "./content/canvas-renderer.ts";
import {
  putTesEventContext,
  type TesEventContextStoreClient,
} from "./tes-event-context-store.ts";

export function getInputValue(
  state: Record<string, Record<string, unknown>>,
  blockId: string,
): string {
  const block = state[blockId];
  if (!block) return "";
  const payload = block.value;
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }

  const row = payload as Record<string, unknown>;
  if (typeof row.value === "string") return row.value;
  if (typeof row.selected_date === "string") return row.selected_date;
  if (row.rich_text_value) return richTextValueToText(row.rich_text_value);

  const selectedOption = row.selected_option;
  if (selectedOption && typeof selectedOption === "object") {
    const value = (selectedOption as { value?: unknown }).value;
    if (typeof value === "string") return value;
  }

  const selectedOptions = row.selected_options;
  if (Array.isArray(selectedOptions)) {
    return selectedOptions
      .map((option) => {
        if (!option || typeof option !== "object") return "";
        const value = (option as { value?: unknown }).value;
        return typeof value === "string" ? value : "";
      })
      .filter((value) => value.length > 0)
      .join(", ");
  }

  return "";
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
  extends CanvasSectionsClient, CanvasAssetUploadClient, TesEventContextStoreClient {
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
 * Processes an onboarding modal submission: updates context, store, and dashboard.
 * Uses the TES Event Context Store — does not read canvas markdown.
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

  const firstComplete = existingContext.onboardingComplete === false;
  const { context } = processOnboardingSubmit(
    existingContext,
    form,
  );

  try {
    await putTesEventContext(client, context);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

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

  if (context.requirementsCanvasId) {
    const requirementsContent = renderRequirementsCanvas(context, form);
    await replaceCanvasContent(
      client,
      context.requirementsCanvasId,
      requirementsContent,
    );
  }

  if (firstComplete) {
    await client.chat.postMessage({
      channel: metadata.channel_id,
      text:
        "✅ Onboarding complete! @mention the bot with your requirement documents to summon the Requirements Agent.",
    });
  }

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
