import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { serializeEventContext } from "../event-context.ts";
import {
  getContextFieldForStepId,
  loadComposition,
  type CompositionManifest,
  type CompositionStep,
} from "./composition-resolver.ts";
import {
  validateMessageBlocks,
} from "./capability-validator.ts";
import { TEMPLATES_BY_PATH } from "./embedded-templates.generated.ts";

const PINNED_INDEX_TITLE = "TES Event Channel Index";

function loadPinnedIndexTemplate() {
  const template = TEMPLATES_BY_PATH["messages/pinned-index.hbs.json"];
  if (!template) {
    throw new Error("Missing precompiled template messages/pinned-index.hbs.json");
  }
  return template;
}

/** Resets cached message templates — for tests only. */
export function resetMessageCacheForTests(): void {
}

function resolveComposition(
  composition?: CompositionManifest,
): CompositionManifest {
  return composition ?? loadComposition("tes-event");
}

export interface RenderPinnedIndexOptions {
  /** Slack workspace ID (T…). Falls back to SLACK_TEAM_ID when omitted. */
  teamId?: string;
}

function resolveNavigationTeamId(options?: RenderPinnedIndexOptions): string {
  const teamId = options?.teamId?.trim() ||
    Deno.env.get("SLACK_TEAM_ID")?.trim();
  if (!teamId) {
    throw new Error(
      "Navigation links require a Slack team ID — set SLACK_TEAM_ID or pass teamId in render options",
    );
  }
  return teamId;
}

/** Builds a Slack mrkdwn URL for a canvas or list object. */
export function buildObjectLinkUrl(
  teamId: string,
  linkType: "canvas" | "list",
  objectId: string,
): string {
  if (linkType === "canvas") {
    return `https://app.slack.com/docs/${teamId}/${objectId}`;
  }
  return `https://app.slack.com/lists/${teamId}/${objectId}`;
}

function formatMrkdwnLink(url: string, label: string): string {
  return `<${url}|${label}>`;
}

function isNavigableStep(
  step: CompositionStep,
): step is CompositionStep & { title: string; kind: "canvas" | "list" } {
  return (step.kind === "canvas" || step.kind === "list") &&
    typeof step.title === "string" &&
    step.title.trim().length > 0;
}

function getStepObjectId(
  context: TesEventContext,
  step: CompositionStep & { title: string },
): string {
  const field = getContextFieldForStepId(step.id);
  if (!field) {
    throw new Error(
      `Navigation entry "${step.title}" references step id "${step.id}" which is not mapped — cannot build pinned index link`,
    );
  }
  const value = context[field];
  return typeof value === "string" ? value : "";
}

function buildNavigationLinks(
  context: TesEventContext,
  composition: CompositionManifest,
  teamId: string,
): string[] {
  return composition.steps.filter(isNavigableStep).map((step) => {
    const id = getStepObjectId(context, step);
    const linkType = step.kind === "canvas" ? "canvas" : "list";
    const url = buildObjectLinkUrl(teamId, linkType, id);
    return `- ${formatMrkdwnLink(url, step.title)}`;
  });
}

function buildIndexMessageText(
  context: TesEventContext,
  composition?: CompositionManifest,
  options?: RenderPinnedIndexOptions,
): string {
  const manifest = resolveComposition(composition);
  const teamId = resolveNavigationTeamId(options);
  const links = buildNavigationLinks(context, manifest, teamId);

  return [
    `📋 *${PINNED_INDEX_TITLE}*`,
    "",
    ...links,
    "",
    context.onboardingComplete
      ? "✅ Onboarding complete — publish a situation report or @mention the bot with documents to summon the Requirements Agent."
      : "⏳ Click *Complete onboarding* below to unlock the Requirements Agent.",
  ].join("\n");
}

/** Renders pinned index message plain text from composition steps. */
export function renderPinnedIndexMessage(
  context: TesEventContext,
  composition?: CompositionManifest,
  options?: RenderPinnedIndexOptions,
): string {
  return buildIndexMessageText(context, composition, options);
}

/** Renders pinned index Block Kit blocks from declarative template. */
export function renderPinnedIndexBlocks(
  context: TesEventContext,
  composition?: CompositionManifest,
  options?: RenderPinnedIndexOptions,
): Record<string, unknown>[] {
  const template = loadPinnedIndexTemplate();
  const rendered = template({
    messageText: buildIndexMessageText(context, composition, options),
    onboardingComplete: context.onboardingComplete,
    buttonValueJson: {
      dashboard_canvas_id: context.dashboardCanvasId,
      dashboard_canvas_content: serializeEventContext(context),
    },
    publishButtonValueJson: {
      dashboard_canvas_id: context.dashboardCanvasId,
      situation_report_canvas_id: context.situationReportCanvasId,
    },
  });

  const blocks = JSON.parse(rendered) as Record<string, unknown>[];
  validateMessageBlocks(blocks, "messages/pinned-index.hbs.json");
  return blocks;
}

/** Backward-compatible alias. */
export function pinnedIndexMessage(
  context: TesEventContext,
  options?: RenderPinnedIndexOptions,
): string {
  return renderPinnedIndexMessage(context, undefined, options);
}

/** Backward-compatible alias. */
export function pinnedIndexBlocks(
  context: TesEventContext,
  options?: RenderPinnedIndexOptions,
): Record<string, unknown>[] {
  return renderPinnedIndexBlocks(context, undefined, options);
}
