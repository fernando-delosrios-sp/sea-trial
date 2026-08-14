import { readContentJson } from "./paths.ts";

export type ApiAvailability = "stable" | "preview" | "planned";

export interface KindDefinition {
  kind: string;
  version: string;
  api_availability: ApiAvailability;
  provision: { handler: string };
}

const KIND_FILES: Record<string, string> = {
  canvas: "kinds/canvas.v1.json",
  list: "kinds/list.v1.json",
  message: "kinds/message.v1.json",
  modal: "kinds/modal.v1.json",
};

let cachedKinds: Map<string, KindDefinition> | null = null;
let testKindAvailability: Map<string, ApiAvailability> | null = null;

/** Overrides registry availability for a kind — tests only. */
export function setKindAvailabilityForTests(
  kindName: string,
  availability: ApiAvailability,
): void {
  if (!testKindAvailability) testKindAvailability = new Map();
  testKindAvailability.set(kindName, availability);
}

function validateKindDefinition(data: unknown, source: string): KindDefinition {
  if (!data || typeof data !== "object") {
    throw new Error(`${source} must be an object`);
  }
  const row = data as Record<string, unknown>;
  const kind = requireString(row, "kind", source);
  const version = requireString(row, "version", source);
  const api_availability = requireApiAvailability(row, source);
  const provision = requireProvision(row, source);

  return { kind, version, api_availability, provision };
}

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

function requireApiAvailability(
  row: Record<string, unknown>,
  source: string,
): ApiAvailability {
  const value = row.api_availability;
  if (value === "stable" || value === "preview" || value === "planned") {
    return value;
  }
  throw new Error(
    `${source} api_availability must be stable, preview, or planned`,
  );
}

function requireProvision(
  row: Record<string, unknown>,
  source: string,
): { handler: string } {
  const provision = row.provision;
  if (!provision || typeof provision !== "object" || Array.isArray(provision)) {
    throw new Error(`${source} must contain provision object`);
  }
  const handler = (provision as Record<string, unknown>).handler;
  if (typeof handler !== "string" || handler.trim() === "") {
    throw new Error(`${source} provision.handler must be a non-empty string`);
  }
  return { handler: handler.trim() };
}

/** Loads and validates a kind definition from the registry. */
export function loadKindDefinition(kindName: string): KindDefinition {
  if (!cachedKinds) {
    cachedKinds = new Map();
  }
  const cached = cachedKinds.get(kindName);
  if (cached) return cached;

  const relativePath = KIND_FILES[kindName];
  if (!relativePath) {
    throw new Error(`Unknown kind "${kindName}" — not in kind registry index`);
  }

  const data = readContentJson(relativePath);
  const definition = validateKindDefinition(data, relativePath);
  if (definition.kind !== kindName) {
    throw new Error(
      `${relativePath} kind "${definition.kind}" does not match registry key "${kindName}"`,
    );
  }

  cachedKinds.set(kindName, definition);
  return definition;
}

/** Returns true when the kind is safe to provision at channel create. */
export function isKindProvisionable(kindName: string): boolean {
  const override = testKindAvailability?.get(kindName);
  if (override !== undefined) {
    return override === "stable";
  }
  const definition = loadKindDefinition(kindName);
  return definition.api_availability === "stable";
}

/** Resets cached kind definitions — for tests only. */
export function resetKindCacheForTests(): void {
  cachedKinds = null;
  testKindAvailability = null;
}
