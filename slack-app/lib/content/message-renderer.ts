import Handlebars from "handlebars";
import type { TesEventContext } from "@tes/shared/types/index.ts";
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

function buildIndexMessageText(context: TesEventContext): string {
  return [
    "📋 *TES Event Channel Index*",
    "",
    `- <canvas:${context.dashboardCanvasId}|Dashboard>`,
    `- <canvas:${context.requirementsCanvasId}|Requirements>`,
    `- <canvas:${context.infrastructureCanvasId}|Infrastructure>`,
    `- <list:${context.deliverablesListId}|Deliverables>`,
    `- <list:${context.incidentsListId}|Incidents>`,
    "",
    context.onboardingComplete
      ? "✅ Onboarding complete — @mention the bot with documents to summon the Requirements Agent."
      : "⏳ Click *Complete onboarding* below to unlock the Requirements Agent.",
  ].join("\n");
}

/** Renders pinned index message plain text. */
export function renderPinnedIndexMessage(context: TesEventContext): string {
  return buildIndexMessageText(context);
}

/** Renders pinned index Block Kit blocks from declarative template. */
export function renderPinnedIndexBlocks(
  context: TesEventContext,
): Record<string, unknown>[] {
  const template = loadPinnedIndexTemplate();
  const rendered = template({
    messageText: buildIndexMessageText(context),
    onboardingComplete: context.onboardingComplete,
    buttonValueJson: {
      dashboard_canvas_id: context.dashboardCanvasId,
    },
  });

  return JSON.parse(rendered) as Record<string, unknown>[];
}

/** Backward-compatible alias. */
export function pinnedIndexMessage(context: TesEventContext): string {
  return renderPinnedIndexMessage(context);
}

/** Backward-compatible alias. */
export function pinnedIndexBlocks(
  context: TesEventContext,
): Record<string, unknown>[] {
  return renderPinnedIndexBlocks(context);
}
