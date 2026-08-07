import type { OnboardingForm, TesEventContext } from "@tes/shared/types/index.ts";
import { applyOnboarding } from "./event-context.ts";
import { deriveComponents } from "./suite-components.ts";
import { dashboardTemplate } from "./content/canvas-renderer.ts";

export interface OnboardingSubmitResult {
  context: TesEventContext;
  dashboardContent: string;
}

/**
 * Applies onboarding form data to an existing event context and builds Dashboard content.
 */
export function processOnboardingSubmit(
  existingContext: TesEventContext,
  form: OnboardingForm,
): OnboardingSubmitResult {
  const components = deriveComponents(form.sailpointSuite);
  const context = applyOnboarding(existingContext, form, components);
  return {
    context,
    dashboardContent: dashboardTemplate(context),
  };
}

export { ONBOARDING_MODAL_BLOCKS } from "./onboarding-modal.ts";
