import type { OnboardingForm, TesEventContext } from "@sea-trial/shared/types/index.ts";
import { applyCanvasAssetUrls } from "./canvas-assets.ts";
import { loadValidatedCanvasTemplate } from "./template-loader.ts";
import { buildSituationReportSeedMarkdown } from "../situation-report.ts";

const NOT_SET = "_Not set_";

import { safeGetEnv } from "../env.ts";

export interface DashboardRenderOptions {
  /** Slack-hosted image URLs keyed by the local path used in canvas markdown. */
  assetUrls?: Record<string, string>;
  /** Link for opening onboarding (trigger URL or pinned index deep link). */
  onboardingLink?: string;
}

function loadTemplate(relativePath: string) {
  return loadValidatedCanvasTemplate(relativePath);
}

/** Resets cached canvas content — for tests only. */
export function resetCanvasCacheForTests(): void {
}

function formatMembers(context: TesEventContext): string {
  return context.memberUserIds?.length
    ? context.memberUserIds.map((id) => `<@${id}>`).join(", ")
    : NOT_SET;
}

/**
 * Renders a possibly multi-entry onboarding value inside a canvas bullet.
 * Multiple entries become a nested list so the parent bullet stays valid markdown.
 */
function formatEntries(value: string | undefined): string {
  const lines = (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) return lines[0] ?? "";
  return `\n${lines.map((line) => `    - ${line}`).join("\n")}`;
}

function buildCanvasViewModel(
  context: TesEventContext,
  form?: OnboardingForm,
  options?: DashboardRenderOptions,
): Record<string, unknown> {
  const details = form ?? context.onboarding;

  return {
    projectName: context.projectName,
    channelId: context.channelId,
    onboardingComplete: context.onboardingComplete,
    accountDisplay: context.accountName ?? NOT_SET,
    salesforceDisplay: context.salesforceOpportunityUrl ?? NOT_SET,
    membersDisplay: formatMembers(context),
    notesDisplay: context.contextNotes ?? NOT_SET,
    statusDisplay: context.onboardingComplete ? "✅ Complete" : "⏳ Pending",
    showOpportunityDetails: Boolean(details),
    opportunityAccount: details?.accountName ?? "",
    opportunityGoal: formatEntries(details?.mainProspectGoal),
    opportunityDealHistory: formatEntries(details?.dealHistory),
    opportunityProjectType: details?.projectType ?? "",
    opportunityStakeholders: formatEntries(details?.stakeholders),
    opportunityCompetitors: details?.competitors ?? "",
    opportunitySuite: details?.sailpointSuite ?? "",
    opportunityDeadline: details?.deadline ?? "",
    opportunityNotes: formatEntries(details?.notes),
    hasDerivedComponents: context.derivedComponents.length > 0,
    derivedComponents: context.derivedComponents,
  };
}

/** Renders the Dashboard canvas markdown. Event context is not stored on the canvas. */
export function renderDashboardCanvas(
  context: TesEventContext,
  form?: OnboardingForm,
  options?: DashboardRenderOptions,
): string {
  const template = loadTemplate("canvases/dashboard.hbs.md");
  let body = template(buildCanvasViewModel(context, form, options)).trim();
  if (options?.assetUrls && Object.keys(options.assetUrls).length > 0) {
    body = applyCanvasAssetUrls(body, options.assetUrls);
  }
  return body;
}

export interface RequirementsRenderOptions {
  planDeliverablesUrl?: string;
}

/** Renders the Requirements canvas from declarative template. */
export function renderRequirementsCanvas(
  context?: TesEventContext,
  form?: OnboardingForm,
  options?: RequirementsRenderOptions,
): string {
  const template = loadTemplate("canvases/requirements.hbs.md");
  const data = context ? buildCanvasViewModel(context, form) : {};
  const planUrl = options?.planDeliverablesUrl ??
    safeGetEnv("SLACK_PLAN_DELIVERABLES_TRIGGER_URL") ??
    "https://slack.com/shortcuts/Ft0CDD23R1RS/06a1b50a92c70a5bdcb17faadaa7f787";
  if (planUrl) {
    data.planDeliverablesUrl = planUrl;
  }
  return template(data).trim();
}

/** Renders the Infrastructure canvas from declarative template. */
export function renderInfrastructureCanvas(): string {
  const template = loadTemplate("canvases/infrastructure.hbs.md");
  return template({}).trim();
}

/** Renders the Situation Report canvas seed content before first publish. */
export function renderSituationReportSeedCanvas(
  context: TesEventContext,
): string {
  return buildSituationReportSeedMarkdown(context);
}

export interface DeliveryFragmentViewModel {
  customerSummary: string;
  visualProofUrl?: string;
  sailpointComponents?: string;
  externalTechnologies?: string;
  artefactsAndConfig?: string;
}

/** Renders the Delivery Proof fragment from the declarative template. */
export function renderDeliveryFragment(
  viewModel: DeliveryFragmentViewModel,
): string {
  const template = loadTemplate("canvases/delivery.fragment.hbs.md");
  return template(viewModel).trim();
}

/** Backward-compatible alias for dashboard rendering. */
export function dashboardTemplate(
  context: TesEventContext,
  form?: OnboardingForm,
): string {
  return renderDashboardCanvas(context, form);
}

/** Backward-compatible alias for requirements rendering. */
export function requirementsTemplate(
  context?: TesEventContext,
  form?: OnboardingForm,
): string {
  return renderRequirementsCanvas(context, form);
}

/** Backward-compatible alias for infrastructure rendering. */
export function infrastructureTemplate(): string {
  return renderInfrastructureCanvas();
}


