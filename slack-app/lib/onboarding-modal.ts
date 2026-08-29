import {
  buildOnboardingModalView as compileOnboardingModalView,
  ONBOARDING_MODAL_BLOCKS,
  type OnboardingModalParams,
} from "./content/modal-compiler.ts";
import { deserializeEventContext } from "./event-context.ts";

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
 * Resolves Account pre-fill from a trigger context snapshot when present.
 */
export function resolveAccountPrefill(
  dashboardCanvasContent: string,
): string | undefined {
  return deserializeEventContext(dashboardCanvasContent)?.accountName;
}
