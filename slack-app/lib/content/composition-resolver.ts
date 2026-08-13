import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { readContentJson } from "./paths.ts";

export interface ProvisionEntry {
  slot: string;
  kind: string;
  ref: string;
  title?: string;
  depends_on?: string[];
  pin?: boolean;
  created_by?: string;
  channel_tab?: boolean;
}

export interface NavigationEntry {
  slot: string;
  label: string;
  link_type: "canvas" | "list";
}

export interface CompositionManifest {
  version: string;
  channel_type: string;
  runtime: {
    context_slot_map: Record<string, string>;
  };
  resources: ProvisionEntry[];
  chrome?: ProvisionEntry[];
  gates?: Array<{
    id: string;
    blocks?: string[];
    until?: Record<string, unknown>;
    modal_ref?: string;
  }>;
  modals?: Array<{ ref: string; kind: string }>;
  navigation: {
    title: string;
    entries: NavigationEntry[];
  };
  dynamic_resources?: ProvisionEntry[];
  organization?: ProvisionEntry[];
  automation?: ProvisionEntry[];
}

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

function requireProvisionEntries(
  value: unknown,
  source: string,
  required: boolean,
): ProvisionEntry[] {
  if (value === undefined) {
    if (required) {
      throw new Error(`${source} must contain resources array`);
    }
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${source} resources must be an array`);
  }

  return value.map((entry, index) => {
    const label = `${source} resources[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${label} must be an object`);
    }
    const row = entry as Record<string, unknown>;
    const slot = requireString(row, "slot", label);
    const kind = requireString(row, "kind", label);
    const ref = requireString(row, "ref", label);
    const title = typeof row.title === "string" ? row.title : undefined;
    const depends_on = Array.isArray(row.depends_on)
      ? row.depends_on.map((dep, depIndex) => {
        if (typeof dep !== "string" || dep.trim() === "") {
          throw new Error(`${label}.depends_on[${depIndex}] must be a string`);
        }
        return dep.trim();
      })
      : undefined;
    const pin = typeof row.pin === "boolean" ? row.pin : undefined;
    const created_by = typeof row.created_by === "string"
      ? row.created_by
      : undefined;
    const channel_tab = typeof row.channel_tab === "boolean"
      ? row.channel_tab
      : undefined;

    return { slot, kind, ref, title, depends_on, pin, created_by, channel_tab };
  });
}

function validateComposition(data: unknown, source: string): CompositionManifest {
  if (!data || typeof data !== "object") {
    throw new Error(`${source} must be an object`);
  }
  const row = data as Record<string, unknown>;

  const version = requireString(row, "version", source);
  const channel_type = requireString(row, "channel_type", source);

  const runtime = row.runtime;
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) {
    throw new Error(`${source} must contain runtime object`);
  }
  const context_slot_map = (runtime as Record<string, unknown>).context_slot_map;
  if (
    !context_slot_map || typeof context_slot_map !== "object" ||
    Array.isArray(context_slot_map)
  ) {
    throw new Error(`${source} runtime.context_slot_map must be an object`);
  }
  for (const [slot, field] of Object.entries(context_slot_map)) {
    if (typeof field !== "string" || field.trim() === "") {
      throw new Error(
        `${source} runtime.context_slot_map.${slot} must be a non-empty string`,
      );
    }
  }

  const resources = requireProvisionEntries(row.resources, source, true);

  const navigation = row.navigation;
  if (!navigation || typeof navigation !== "object" || Array.isArray(navigation)) {
    throw new Error(`${source} must contain navigation object`);
  }
  const navRow = navigation as Record<string, unknown>;
  const navTitle = requireString(navRow, "title", `${source} navigation`);
  const navEntriesRaw = navRow.entries;
  if (!Array.isArray(navEntriesRaw) || navEntriesRaw.length === 0) {
    throw new Error(`${source} navigation.entries must be a non-empty array`);
  }
  const entries: NavigationEntry[] = navEntriesRaw.map((entry, index) => {
    const label = `${source} navigation.entries[${index}]`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${label} must be an object`);
    }
    const entryRow = entry as Record<string, unknown>;
    const slot = requireString(entryRow, "slot", label);
    const entryLabel = requireString(entryRow, "label", label);
    const link_type = entryRow.link_type;
    if (link_type !== "canvas" && link_type !== "list") {
      throw new Error(`${label}.link_type must be canvas or list`);
    }
    return { slot, label: entryLabel, link_type };
  });

  return {
    version,
    channel_type,
    runtime: {
      context_slot_map: context_slot_map as Record<string, string>,
    },
    resources,
    chrome: requireProvisionEntries(row.chrome, source, false),
    gates: row.gates as CompositionManifest["gates"],
    modals: row.modals as CompositionManifest["modals"],
    navigation: { title: navTitle, entries },
    dynamic_resources: requireProvisionEntries(row.dynamic_resources, source, false),
    organization: requireProvisionEntries(row.organization, source, false),
    automation: requireProvisionEntries(row.automation, source, false),
  };
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
  if (composition.channel_type !== channelType) {
    throw new Error(
      `${relativePath} channel_type "${composition.channel_type}" does not match "${channelType}"`,
    );
  }

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

/**
 * Returns resource entries in provisioning order (dependencies first).
 * @throws when depends_on references unknown slots or cycles exist
 */
export function resolveProvisioningOrder(
  resources: ProvisionEntry[],
): ProvisionEntry[] {
  const bySlot = new Map(resources.map((entry) => [entry.slot, entry]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: ProvisionEntry[] = [];

  function visit(slot: string): void {
    if (visited.has(slot)) return;
    if (visiting.has(slot)) {
      throw new Error(`Cyclic dependency detected at slot "${slot}"`);
    }

    const entry = bySlot.get(slot);
    if (!entry) {
      throw new Error(`Unknown dependency slot "${slot}"`);
    }

    visiting.add(slot);
    for (const dep of entry.depends_on ?? []) {
      visit(dep);
    }
    visiting.delete(slot);
    visited.add(slot);
    ordered.push(entry);
  }

  for (const entry of resources) {
    visit(entry.slot);
  }

  return ordered;
}

/** Maps a composition slot to its TesEventContext field name. */
export function getContextFieldForSlot(
  composition: CompositionManifest,
  slot: string,
): keyof TesEventContext | undefined {
  const field = composition.runtime.context_slot_map[slot];
  return field as keyof TesEventContext | undefined;
}

/** Applies provisioned slot IDs onto a TesEventContext using the slot map. */
export function applySlotIds(
  context: TesEventContext,
  composition: CompositionManifest,
  slotIds: Record<string, string>,
): TesEventContext {
  const updated = { ...context };

  for (const [slot, slackId] of Object.entries(slotIds)) {
    const field = getContextFieldForSlot(composition, slot);
    if (!field) continue;
    (updated as Record<string, unknown>)[field as string] = slackId;
  }

  return updated;
}

/** Resets cached compositions — for tests only. */
export function resetCompositionCacheForTests(): void {
  cachedCompositions = null;
}
