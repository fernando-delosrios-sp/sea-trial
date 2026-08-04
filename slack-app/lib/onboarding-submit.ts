import type { OnboardingForm, TesEventContext } from "@tes/shared/types/index.ts";
import { applyOnboarding } from "./event-context.ts";
import { deriveComponents } from "./suite-components.ts";
import { dashboardTemplate } from "../templates/index.ts";

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

export const ONBOARDING_MODAL_BLOCKS = [
  "customer_name",
  "main_prospect_goal",
  "deal_history",
  "project_type",
  "stakeholders",
  "competitors",
  "sailpoint_suite",
  "deadline",
  "notes",
] as const;
