import Handlebars from "handlebars";
import type { TesEventContext } from "@tes/shared/types/index.ts";
import {
  getContextFieldForSlot,
  loadComposition,
  type CompositionManifest,
} from "./composition-resolver.ts";
import {
  validateMessageBlocks,
} from "./capability-validator.ts";
import { readContentText } from "./paths.ts";

let cachedTemplate: Handlebars.TemplateDelegate | null = null;
let helpersRegistered = false;

function ensureHelpers(): void {
  if (helpersRegistered) return;
  Handlebars.registerHelper("json", (value: unknown) => {
    return new Handlebars.SafeString(JSON.stringify(value));
  });
  helpersRegistered = true;
}

function loadPinnedIndexTemplate(): Handlebars.TemplateDelegate {
  ensureHelpers();
  if (cachedTemplate) return cachedTemplate;
  const source = readContentText("messages/pinned-index.hbs.json");
  cachedTemplate = Handlebars.compile(source, { strict: false, noEscape: true });
  return cachedTemplate;
}

/** Resets cached message templates — for tests only. */
export function resetMessageCacheForTests(): void {
  cachedTemplate = null;
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

function getSlotId(
  context: TesEventContext,
  composition: CompositionManifest,
  slot: string,
  linkLabel: string,
): string {
  const field = getContextFieldForSlot(composition, slot);
  if (!field) {
    throw new Error(
      `Navigation entry "${linkLabel}" references slot "${slot}" which is not mapped in runtime.context_slot_map — cannot build pinned index link`,
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
  return composition.navigation.entries.map((entry) => {
    const id = getSlotId(context, composition, entry.slot, entry.label);
    const url = buildObjectLinkUrl(teamId, entry.link_type, id);
    return `- ${formatMrkdwnLink(url, entry.label)}`;
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
    `📋 *${manifest.navigation.title}*`,
    "",
    ...links,
    "",
    context.onboardingComplete
      ? "✅ Onboarding complete — publish a situation report or @mention the bot with documents to summon the Requirements Agent."
      : "⏳ Click *Complete onboarding* below to unlock the Requirements Agent.",
  ].join("\n");
}

/** Renders pinned index message plain text from composition navigation. */
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

