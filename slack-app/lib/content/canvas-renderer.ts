import type { OnboardingForm, TesEventContext } from "@tes/shared/types/index.ts";
import { serializeEventContext } from "../event-context.ts";
import { applyCanvasAssetUrls } from "./canvas-assets.ts";
import { readContentText } from "./paths.ts";
import { TEMPLATES_BY_PATH } from "./embedded-templates.generated.ts";
import { buildSituationReportSeedMarkdown } from "../situation-report.ts";

const NOT_SET = "_Not set_";

let cachedDefaultDashboard: string | null = null;

function loadDefaultDashboardContent(): string {
  if (cachedDefaultDashboard === null) {
    cachedDefaultDashboard = readContentText("canvases/dashboard.md");
  }
  return cachedDefaultDashboard;
}

function loadTemplate(relativePath: string) {
  const template = TEMPLATES_BY_PATH[relativePath];
  if (!template) {
    throw new Error(`Unknown canvas template "${relativePath}"`);
  }
  return template;
}

/** Resets cached canvas content — for tests only. */
export function resetCanvasCacheForTests(): void {
  cachedDefaultDashboard = null;
}

function formatMembers(context: TesEventContext): string {
  return context.memberUserIds?.length
    ? context.memberUserIds.map((id) => `<@${id}>`).join(", ")
    : NOT_SET;
}

function buildDashboardViewModel(
  context: TesEventContext,
  form?: OnboardingForm,
): Record<string, unknown> {
  const details = form ?? context.onboarding;

  return {
    projectName: context.projectName,
    channelId: context.channelId,
    accountDisplay: context.accountName ?? NOT_SET,
    salesforceDisplay: context.salesforceOpportunityUrl ?? NOT_SET,
    membersDisplay: formatMembers(context),
    notesDisplay: context.contextNotes ?? NOT_SET,
    statusDisplay: context.onboardingComplete ? "✅ Complete" : "⏳ Pending",
    showOpportunityDetails: Boolean(details),
    opportunityAccount: details?.accountName ?? "",
    opportunityGoal: details?.mainProspectGoal ?? "",
    opportunityDealHistory: details?.dealHistory ?? "",
    opportunityProjectType: details?.projectType ?? "",
    opportunityStakeholders: details?.stakeholders ?? "",
    opportunityCompetitors: details?.competitors ?? "",
    opportunitySuite: details?.sailpointSuite ?? "",
    opportunityDeadline: details?.deadline ?? "",
    opportunityNotes: details?.notes ?? "",
    hasDerivedComponents: context.derivedComponents.length > 0,
    derivedComponents: context.derivedComponents,
  };
}

export interface DashboardRenderOptions {
  /** Slack-hosted image URLs keyed by the local path used in canvas markdown. */
  assetUrls?: Record<string, string>;
}

/** Renders the Dashboard canvas markdown with metadata injected by code. */
export function renderDashboardCanvas(
  context: TesEventContext,
  form?: OnboardingForm,
  options?: DashboardRenderOptions,
): string {
  const defaultContent = loadDefaultDashboardContent().trim();
  const template = loadTemplate("canvases/dashboard.hbs.md");
  const dynamicContent = template(buildDashboardViewModel(context, form)).trim();
  let body = [defaultContent, dynamicContent].filter(Boolean).join("\n\n");
  if (options?.assetUrls && Object.keys(options.assetUrls).length > 0) {
    body = applyCanvasAssetUrls(body, options.assetUrls);
  }
  return [body, serializeEventContext(context)].join("\n");
}

/** Renders the Requirements canvas from declarative template. */
export function renderRequirementsCanvas(): string {
  const template = loadTemplate("canvases/requirements.hbs.md");
  return template({}).trim();
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

export interface DeliveryCanvasViewModel {
  taskId: string;
  category: string;
  author: string;
  draftVersion: number;
  generatedAt: string;
  reviewPending: boolean;
  businessValue: string;
  visualProof: string;
  sailpointComponents: string;
  externalTechnologies: string;
  customerSummary: string;
  artefactRows: string;
  configuration: string;
  notes: string;
  consolidateActionUrl?: string;
  markReviewedActionUrl?: string;
}

/** Renders a Delivery Template Canvas from the declarative template. */
export function renderDeliveryCanvas(
  viewModel: DeliveryCanvasViewModel,
): string {
  const template = loadTemplate("canvases/delivery.hbs.md");
  return template({
    ...viewModel,
    reviewPending: viewModel.reviewPending,
  }).trim();
}

/** Backward-compatible alias for dashboard rendering. */
export function dashboardTemplate(
  context: TesEventContext,
  form?: OnboardingForm,
): string {
  return renderDashboardCanvas(context, form);
}

/** Backward-compatible alias for requirements rendering. */
export function requirementsTemplate(): string {
  return renderRequirementsCanvas();
}

/** Backward-compatible alias for infrastructure rendering. */
export function infrastructureTemplate(): string {
  return renderInfrastructureCanvas();
}


