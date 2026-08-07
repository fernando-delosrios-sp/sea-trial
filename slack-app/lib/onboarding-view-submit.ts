import type { OnboardingForm } from "@tes/shared/types/index.ts";
import { deserializeEventContext } from "./event-context.ts";
import { processOnboardingSubmit } from "./onboarding-submit.ts";
import { readCanvasMarkdown, replaceCanvasContent, type CanvasSectionsClient } from "./canvas.ts";

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

export interface SlackOnboardingSubmitClient extends CanvasSectionsClient {
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
      error: "Could not load TesEventContext from Dashboard canvas.",
    };
  }

  const { context, dashboardContent } = processOnboardingSubmit(
    existingContext,
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
 * Loads dashboard markdown for opening onboarding from the pinned index button.
 */
export async function loadDashboardContentForButton(
  client: SlackOnboardingSubmitClient,
  buttonValue: string | undefined,
  fallbackContent: string,
): Promise<string> {
  if (!buttonValue) return fallbackContent;

  try {
    const parsed = JSON.parse(buttonValue) as { dashboard_canvas_id?: string };
    if (parsed.dashboard_canvas_id) {
      return await readCanvasMarkdown(client, parsed.dashboard_canvas_id);
    }
  } catch {
    // Fall through to fallback content.
  }

  return fallbackContent;
}

