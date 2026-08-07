import { getSupportedSuites } from "./suite-components.ts";

export const ONBOARDING_MODAL_BLOCKS = [
  "account_name",
  "main_prospect_goal",
  "deal_history",
  "project_type",
  "stakeholders",
  "competitors",
  "sailpoint_suite",
  "deadline",
  "notes",
] as const;

export interface OnboardingModalParams {
  channelId: string;
  dashboardCanvasContent: string;
  accountName?: string;
}

/**
 * Builds the onboarding modal view with optional Account pre-fill.
 */
export function buildOnboardingModalView(
  params: OnboardingModalParams,
): Record<string, unknown> {
  const suites = getSupportedSuites();
  const accountElement: Record<string, unknown> = {
    type: "plain_text_input",
    action_id: "value",
  };

  if (params.accountName) {
    accountElement.initial_value = params.accountName;
  }

  return {
    type: "modal",
    callback_id: "submit_onboarding",
    private_metadata: JSON.stringify({
      channel_id: params.channelId,
      dashboard_canvas_content: params.dashboardCanvasContent,
    }),
    title: { type: "plain_text", text: "TES Onboarding" },
    submit: { type: "plain_text", text: "Submit" },
    blocks: [
      {
        type: "input",
        block_id: "account_name",
        label: { type: "plain_text", text: "Account" },
        element: accountElement,
      },
      {
        type: "input",
        block_id: "main_prospect_goal",
        label: { type: "plain_text", text: "Main Prospect Goal" },
        element: { type: "plain_text_input", action_id: "value" },
      },
      {
        type: "input",
        block_id: "deal_history",
        label: { type: "plain_text", text: "Deal History" },
        element: { type: "plain_text_input", action_id: "value" },
      },
      {
        type: "input",
        block_id: "project_type",
        label: { type: "plain_text", text: "Project Type" },
        element: { type: "plain_text_input", action_id: "value" },
      },
      {
        type: "input",
        block_id: "stakeholders",
        label: { type: "plain_text", text: "Stakeholders" },
        element: { type: "plain_text_input", action_id: "value" },
      },
      {
        type: "input",
        block_id: "competitors",
        label: { type: "plain_text", text: "Competitors" },
        element: { type: "plain_text_input", action_id: "value" },
      },
      {
        type: "input",
        block_id: "sailpoint_suite",
        label: { type: "plain_text", text: "SailPoint Suite" },
        element: {
          type: "static_select",
          action_id: "value",
          options: suites.map((s) => ({
            text: { type: "plain_text", text: s },
            value: s,
          })),
        },
      },
      {
        type: "input",
        block_id: "deadline",
        label: { type: "plain_text", text: "Deadline" },
        element: { type: "plain_text_input", action_id: "value" },
      },
      {
        type: "input",
        block_id: "notes",
        label: { type: "plain_text", text: "Notes" },
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "value",
          multiline: true,
        },
      },
    ],
  };
}

/**
 * Resolves Account pre-fill from dashboard canvas metadata when present.
 */
export function resolveAccountPrefill(
  dashboardCanvasContent: string,
): string | undefined {
  const marker = "<!-- tes-event-context -->";
  const markerIndex = dashboardCanvasContent.indexOf(marker);
  if (markerIndex === -1) return undefined;

  const afterMarker = dashboardCanvasContent.slice(markerIndex + marker.length);
  const match = afterMarker.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match?.[1]) return undefined;

  try {
    const parsed = JSON.parse(match[1]) as { accountName?: string };
    return parsed.accountName;
  } catch {
    return undefined;
  }
}
