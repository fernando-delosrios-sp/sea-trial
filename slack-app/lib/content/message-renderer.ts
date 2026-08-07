import Handlebars from "handlebars";
import type { TesEventContext } from "@tes/shared/types/index.ts";
import {
  getContextFieldForSlot,
  loadComposition,
  type CompositionManifest,
} from "./composition-resolver.ts";
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

function getSlotId(
  context: TesEventContext,
  composition: CompositionManifest,
  slot: string,
): string {
  const field = getContextFieldForSlot(composition, slot);
  if (!field) return "";
  const value = context[field];
  return typeof value === "string" ? value : "";
}

function buildNavigationLinks(
  context: TesEventContext,
  composition: CompositionManifest,
): string[] {
  return composition.navigation.entries.map((entry) => {
    const id = getSlotId(context, composition, entry.slot);
    return `- <${entry.link_type}:${id}|${entry.label}>`;
  });
}

function buildIndexMessageText(
  context: TesEventContext,
  composition?: CompositionManifest,
): string {
  const manifest = resolveComposition(composition);
  const links = buildNavigationLinks(context, manifest);

  return [
    `📋 *${manifest.navigation.title}*`,
    "",
    ...links,
    "",
    context.onboardingComplete
      ? "✅ Onboarding complete — @mention the bot with documents to summon the Requirements Agent."
      : "⏳ Click *Complete onboarding* below to unlock the Requirements Agent.",
  ].join("\n");
}

/** Renders pinned index message plain text from composition navigation. */
export function renderPinnedIndexMessage(
  context: TesEventContext,
  composition?: CompositionManifest,
): string {
  return buildIndexMessageText(context, composition);
}

/** Renders pinned index Block Kit blocks from declarative template. */
export function renderPinnedIndexBlocks(
  context: TesEventContext,
  composition?: CompositionManifest,
): Record<string, unknown>[] {
  const template = loadPinnedIndexTemplate();
  const rendered = template({
    messageText: buildIndexMessageText(context, composition),
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
