import {
  buildOnboardingModalView as compileOnboardingModalView,
  ONBOARDING_MODAL_BLOCKS,
  type OnboardingModalParams,
} from "./content/modal-compiler.ts";

export type { OnboardingModalParams };

export { ONBOARDING_MODAL_BLOCKS };

/**
 * Builds the onboarding modal view with optional Account pre-fill.
 */
export function buildOnboardingModalView(
  params: OnboardingModalParams,
): Record<string, unknown> {
  return compileOnboardingModalView(params);
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
