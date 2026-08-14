import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { readContentJson } from "./paths.ts";

export interface CanvasStep {
  id: string;
  kind: "canvas";
  ref: string;
  title?: string;
  tab?: true;
}

export interface ListStep {
  id: string;
  kind: "list";
  ref: string;
  title?: string;
  bookmark?: true;
}

export interface WorkflowStep {
  id: string;
  kind: "workflow";
  link: string;
}

export type CompositionStep = CanvasStep | ListStep | WorkflowStep;

export interface CompositionManifest {
  version: string;
  steps: CompositionStep[];
}

/** Maps step ids to flat TesEventContext fields (internal convention — not in manifest). */
const ID_TO_CONTEXT_FIELD: Record<string, keyof TesEventContext> = {
  dashboard: "dashboardCanvasId",
  requirements: "requirementsCanvasId",
  infrastructure: "infrastructureCanvasId",
  deliverables: "deliverablesListId",
  incidents: "incidentsListId",
  situation_report: "situationReportCanvasId",
};

const CHANNEL_FILES: Record<string, string> = {
  "tes-event": "channels/tes-event.json",
};

let cachedCompositions: Map<string, CompositionManifest> | null = null;

function requireString(
  row: Record<string, unknown>,
  key: string,
  source: string,
): string {
  const value = row[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${source} must contain a non-empty ${key}`);
  }
  return value.trim();
}

function parseStep(entry: unknown, index: number, source: string): CompositionStep {
  const label = `${source} steps[${index}]`;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`${label} must be an object`);
  }
  const row = entry as Record<string, unknown>;
  const id = requireString(row, "id", label);
  const kind = requireString(row, "kind", label);
  const title = typeof row.title === "string" ? row.title : undefined;

  if (kind === "canvas") {
    const ref = requireString(row, "ref", label);
    if (row.link !== undefined) {
      throw new Error(`${label} canvas step must not contain link`);
    }
    if (row.bookmark !== undefined) {
      throw new Error(`${label} canvas step must not contain bookmark`);
    }
    if (row.tab !== undefined && row.tab !== true) {
      throw new Error(`${label}.tab must be true when present`);
    }
    return {
      id,
      kind: "canvas",
      ref,
      title,
      tab: row.tab === true ? true : undefined,
    };
  }

  if (kind === "list") {
    const ref = requireString(row, "ref", label);
    if (row.link !== undefined) {
      throw new Error(`${label} list step must not contain link`);
    }
    if (row.tab !== undefined) {
      throw new Error(`${label} list step must not contain tab`);
    }
    if (row.bookmark !== undefined && row.bookmark !== true) {
      throw new Error(`${label}.bookmark must be true when present`);
    }
    return {
      id,
      kind: "list",
      ref,
      title,
      bookmark: row.bookmark === true ? true : undefined,
    };
  }

  if (kind === "workflow") {
    const link = requireString(row, "link", label);
    if (row.ref !== undefined) {
      throw new Error(`${label} workflow step must not contain ref`);
    }
    if (row.tab !== undefined || row.bookmark !== undefined) {
      throw new Error(`${label} workflow step must not contain tab or bookmark`);
    }
    return { id, kind: "workflow", link };
  }

  throw new Error(`${label}.kind must be canvas, list, or workflow`);
}

function validateComposition(data: unknown, source: string): CompositionManifest {
  if (!data || typeof data !== "object") {
    throw new Error(`${source} must be an object`);
  }
  const row = data as Record<string, unknown>;

  const version = requireString(row, "version", source);

  const stepsRaw = row.steps;
  if (!Array.isArray(stepsRaw) || stepsRaw.length === 0) {
    throw new Error(`${source} steps must be a non-empty array`);
  }

  const steps = stepsRaw.map((entry, index) => parseStep(entry, index, source));

  const seenIds = new Set<string>();
  for (const step of steps) {
    if (seenIds.has(step.id)) {
      throw new Error(`${source} contains duplicate step id "${step.id}"`);
    }
    seenIds.add(step.id);
  }

  return { version, steps };
}

/** Loads and validates a channel composition manifest. */
export function loadComposition(channelType: string): CompositionManifest {
  if (!cachedCompositions) {
    cachedCompositions = new Map();
  }
  const cached = cachedCompositions.get(channelType);
  if (cached) return cached;

  const relativePath = CHANNEL_FILES[channelType];
  if (!relativePath) {
    throw new Error(
      `Unknown channel type "${channelType}" — not in composition index`,
    );
  }

  const data = readContentJson(relativePath);
  const composition = validateComposition(data, relativePath);
  cachedCompositions.set(channelType, composition);
  return composition;
}

/** Parses raw JSON for tests and schema validation. */
export function parseCompositionJson(
  json: string,
  source = "composition",
): CompositionManifest {
  return validateComposition(JSON.parse(json), source);
}

/** Maps a composition step id to its TesEventContext field name. */
export function getContextFieldForStepId(
  stepId: string,
): keyof TesEventContext | undefined {
  return ID_TO_CONTEXT_FIELD[stepId];
}

/** @deprecated Use getContextFieldForStepId — composition no longer carries slot maps. */
export function getContextFieldForSlot(
  _composition: CompositionManifest,
  stepId: string,
): keyof TesEventContext | undefined {
  return getContextFieldForStepId(stepId);
}

/** Applies provisioned step IDs onto a TesEventContext using the id convention map. */
export function applyStepIds(
  context: TesEventContext,
  stepIds: Record<string, string>,
): TesEventContext {
  const updated = { ...context };

  for (const [stepId, slackId] of Object.entries(stepIds)) {
    const field = getContextFieldForStepId(stepId);
    if (!field) continue;
    (updated as Record<string, unknown>)[field as string] = slackId;
  }

  return updated;
}

/** @deprecated Use applyStepIds. */
export function applySlotIds(
  context: TesEventContext,
  _composition: CompositionManifest,
  stepIds: Record<string, string>,
): TesEventContext {
  return applyStepIds(context, stepIds);
}

/** Resets cached compositions — for tests only. */
export function resetCompositionCacheForTests(): void {
  cachedCompositions = null;
}
