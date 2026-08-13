import type { DeliverableStatus } from "@sea-trial/shared/types/index.ts";
import { readContentJson } from "./paths.ts";

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

export interface CustomerStatusMapping {
  internal: DeliverableStatus;
  bucket: string;
  label: string;
}

interface CustomerDeliverableStatusesFile {
  mappings: Array<{ internal: string; bucket: string; label: string }>;
}

const CUSTOMER_BUCKETS = [
  "in_progress",
  "needs_input",
  "in_review",
  "complete",
  "out_of_scope",
] as const;

export type CustomerStatusBucket = typeof CUSTOMER_BUCKETS[number];

const BUCKET_DISPLAY: Record<CustomerStatusBucket, string> = {
  in_progress: "In progress",
  needs_input: "Needs your input",
  in_review: "In review",
  complete: "Complete",
  out_of_scope: "Out of scope",
};

let cachedSuites: Record<string, string[]> | null = null;
let cachedStatusChoices: StatusChoice[] | null = null;
let cachedCustomerStatusMappings: CustomerStatusMapping[] | null = null;

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

function validateCustomerDeliverableStatuses(
  data: unknown,
): CustomerDeliverableStatusesFile {
  if (!data || typeof data !== "object") {
    throw new Error("customer-deliverable-statuses.json must be an object");
  }
  const mappings = (data as Record<string, unknown>).mappings;
  if (!Array.isArray(mappings) || mappings.length === 0) {
    throw new Error(
      "customer-deliverable-statuses.json must contain a non-empty mappings array",
    );
  }

  const parsed: Array<{ internal: string; bucket: string; label: string }> = [];
  for (const [index, row] of mappings.entries()) {
    if (!row || typeof row !== "object") {
      throw new Error(`mappings[${index}] must be an object`);
    }
    const entry = row as Record<string, unknown>;
    const internal = entry.internal;
    const bucket = entry.bucket;
    const label = entry.label;
    if (typeof internal !== "string" || internal.trim() === "") {
      throw new Error(`mappings[${index}].internal must be a non-empty string`);
    }
    if (typeof bucket !== "string" || bucket.trim() === "") {
      throw new Error(`mappings[${index}].bucket must be a non-empty string`);
    }
    if (typeof label !== "string" || label.trim() === "") {
      throw new Error(`mappings[${index}].label must be a non-empty string`);
    }
    if (!CUSTOMER_BUCKETS.includes(bucket as CustomerStatusBucket)) {
      throw new Error(`mappings[${index}].bucket is not a known customer bucket`);
    }
    parsed.push({ internal, bucket, label });
  }

  return { mappings: parsed };
}

function loadSuites(): Record<string, string[]> {
  if (cachedSuites) return cachedSuites;
  const data = readContentJson("domain/sailpoint-suites.json");
  cachedSuites = validateSailpointSuites(data).suites;
  return cachedSuites;
}

function loadStatusChoices(): StatusChoice[] {
  if (cachedStatusChoices) return cachedStatusChoices;
  const data = readContentJson("domain/deliverable-statuses.json");
  cachedStatusChoices = validateDeliverableStatuses(data).choices.map((c) => ({
    value: c.value as DeliverableStatus,
    label: c.label,
  }));
  return cachedStatusChoices;
}

function loadCustomerStatusMappings(): CustomerStatusMapping[] {
  if (cachedCustomerStatusMappings) return cachedCustomerStatusMappings;
  const data = readContentJson("domain/customer-deliverable-statuses.json");
  cachedCustomerStatusMappings = validateCustomerDeliverableStatuses(data)
    .mappings.map((row) => ({
      internal: row.internal as DeliverableStatus,
      bucket: row.bucket,
      label: row.label,
    }));
  return cachedCustomerStatusMappings;
}

/** Resets cached domain data — for tests only. */
export function resetDomainCacheForTests(): void {
  cachedSuites = null;
  cachedStatusChoices = null;
  cachedCustomerStatusMappings = null;
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

/** Parses and validates customer status map JSON from raw strings — for tests. */
export function parseCustomerDeliverableStatusesJson(
  raw: string,
): CustomerStatusMapping[] {
  return validateCustomerDeliverableStatuses(JSON.parse(raw)).mappings.map(
    (row) => ({
      internal: row.internal as DeliverableStatus,
      bucket: row.bucket,
      label: row.label,
    }),
  );
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

/** Returns the full internal → customer status mapping from domain JSON. */
export function getCustomerDeliverableStatusMap(): CustomerStatusMapping[] {
  return [...loadCustomerStatusMappings()];
}

/** Maps an internal deliverable status to its customer-facing bucket label. */
export function mapToCustomerStatus(
  internalStatus: DeliverableStatus,
): CustomerStatusMapping {
  const mapping = loadCustomerStatusMappings().find(
    (row) => row.internal === internalStatus,
  );
  if (!mapping) {
    throw new Error(`No customer status mapping for "${internalStatus}"`);
  }
  return mapping;
}

/** Display names for customer status bucket metric rows. */
export function getCustomerBucketDisplayName(
  bucket: CustomerStatusBucket,
): string {
  return BUCKET_DISPLAY[bucket];
}
