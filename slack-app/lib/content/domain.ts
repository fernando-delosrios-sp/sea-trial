import type { DeliverableStatus } from "@tes/shared/types/index.ts";
import { join } from "std/path/join.ts";
import { fromFileUrl } from "std/path/from_file_url.ts";
import { dirname } from "std/path/dirname.ts";

export interface StatusChoice {
  value: DeliverableStatus;
  label: string;
}

interface SailpointSuitesFile {
  suites: Record<string, string[]>;
}

interface DeliverableStatusesFile {
  choices: Array<{ value: string; label: string }>;
}

const CONTENT_DIR = join(
  dirname(fromFileUrl(import.meta.url)),
  "../../content/domain",
);

let cachedSuites: Record<string, string[]> | null = null;
let cachedStatusChoices: StatusChoice[] | null = null;

function readJsonFile(path: string): unknown {
  const raw = Deno.readTextFileSync(path);
  return JSON.parse(raw);
}

function validateSailpointSuites(data: unknown): SailpointSuitesFile {
  if (!data || typeof data !== "object") {
    throw new Error("sailpoint-suites.json must be an object");
  }
  const suites = (data as Record<string, unknown>).suites;
  if (!suites || typeof suites !== "object" || Array.isArray(suites)) {
    throw new Error("sailpoint-suites.json must contain a suites object");
  }

  const result: Record<string, string[]> = {};
  for (const [suiteName, components] of Object.entries(suites)) {
    if (typeof suiteName !== "string" || suiteName.trim() === "") {
      throw new Error("suite names must be non-empty strings");
    }
    if (!Array.isArray(components) || components.length === 0) {
      throw new Error(`suite "${suiteName}" must have a non-empty components array`);
    }
    for (const component of components) {
      if (typeof component !== "string" || component.trim() === "") {
        throw new Error(`suite "${suiteName}" components must be non-empty strings`);
      }
    }
    result[suiteName] = components;
  }

  if (Object.keys(result).length === 0) {
    throw new Error("sailpoint-suites.json must define at least one suite");
  }

  return { suites: result };
}

function validateDeliverableStatuses(data: unknown): DeliverableStatusesFile {
  if (!data || typeof data !== "object") {
    throw new Error("deliverable-statuses.json must be an object");
  }
  const choices = (data as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("deliverable-statuses.json must contain a non-empty choices array");
  }

  const parsed: Array<{ value: string; label: string }> = [];
  for (const [index, choice] of choices.entries()) {
    if (!choice || typeof choice !== "object") {
      throw new Error(`choices[${index}] must be an object`);
    }
    const row = choice as Record<string, unknown>;
    const value = row.value;
    const label = row.label;
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`choices[${index}].value must be a non-empty string`);
    }
    if (typeof label !== "string" || label.trim() === "") {
      throw new Error(`choices[${index}].label must be a non-empty string`);
    }
    if (value !== label) {
      throw new Error(`choices[${index}] value must equal label`);
    }
    parsed.push({ value, label });
  }

  return { choices: parsed };
}

function loadSuites(): Record<string, string[]> {
  if (cachedSuites) return cachedSuites;
  const path = join(CONTENT_DIR, "sailpoint-suites.json");
  const data = readJsonFile(path);
  cachedSuites = validateSailpointSuites(data).suites;
  return cachedSuites;
}

function loadStatusChoices(): StatusChoice[] {
  if (cachedStatusChoices) return cachedStatusChoices;
  const path = join(CONTENT_DIR, "deliverable-statuses.json");
  const data = readJsonFile(path);
  cachedStatusChoices = validateDeliverableStatuses(data).choices.map((c) => ({
    value: c.value as DeliverableStatus,
    label: c.label,
  }));
  return cachedStatusChoices;
}

/** Resets cached domain data — for tests only. */
export function resetDomainCacheForTests(): void {
  cachedSuites = null;
  cachedStatusChoices = null;
}

/** Parses and validates domain JSON from raw strings — for tests. */
export function parseSailpointSuitesJson(raw: string): Record<string, string[]> {
  return validateSailpointSuites(JSON.parse(raw)).suites;
}

/** Parses and validates deliverable status JSON from raw strings — for tests. */
export function parseDeliverableStatusesJson(raw: string): StatusChoice[] {
  return validateDeliverableStatuses(JSON.parse(raw)).choices.map((c) => ({
    value: c.value as DeliverableStatus,
    label: c.label,
  }));
}

/** Returns all supported SailPoint suite names from domain JSON. */
export function getSupportedSuites(): string[] {
  return Object.keys(loadSuites());
}

/**
 * Derives technical components from the selected SailPoint suite.
 * @param sailpointSuite - Suite name from onboarding form
 */
export function deriveComponents(sailpointSuite: string): string[] {
  return loadSuites()[sailpointSuite] ?? [];
}

/** Returns deliverable status select choices from domain JSON. */
export function getDeliverableStatusChoices(): StatusChoice[] {
  return [...loadStatusChoices()];
}
