import { parse } from "std/yaml/parse.ts";
import { join } from "std/path/join.ts";

export type TriggerScope = "global" | "channel";

export interface TriggerConfigEntry {
  id: string;
  trigger_def: string;
  scope: TriggerScope;
  channels: string[];
  enabled: boolean;
}

export interface TriggersConfig {
  triggers: TriggerConfigEntry[];
}

export interface ProvisionTarget {
  configId: string;
  triggerDef: string;
  scope: TriggerScope;
  channelId?: string;
  title: string;
  description: string;
}

const VALID_SCOPES = new Set<TriggerScope>(["global", "channel"]);

export function parseTriggersConfig(raw: string): TriggersConfig {
  const parsed = parse(raw) as { triggers?: unknown };
  if (!parsed || !Array.isArray(parsed.triggers)) {
    throw new Error("triggers.config.yaml must contain a triggers array");
  }

  const triggers = parsed.triggers.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`triggers[${index}] must be an object`);
    }
    const row = entry as Record<string, unknown>;
    const id = requireString(row, "id", index);
    const trigger_def = requireString(row, "trigger_def", index);
    const scope = requireScope(row.scope, index);
    const enabled = row.enabled === undefined ? true : Boolean(row.enabled);
    const channels = normalizeChannels(row.channels);

    return { id, trigger_def, scope, channels, enabled };
  });

  return { triggers };
}

function requireString(
  row: Record<string, unknown>,
  key: string,
  index: number,
): string {
  const value = row[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`triggers[${index}].${key} must be a non-empty string`);
  }
  return value.trim();
}

function requireScope(value: unknown, index: number): TriggerScope {
  if (typeof value !== "string" || !VALID_SCOPES.has(value as TriggerScope)) {
    throw new Error(
      `triggers[${index}].scope must be "global" or "channel"`,
    );
  }
  return value as TriggerScope;
}

function normalizeChannels(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("channels must be an array of channel IDs");
  }
  return value
    .map((item) => {
      if (typeof item !== "string" || item.trim() === "") {
        throw new Error("channels entries must be non-empty strings");
      }
      return item.trim();
    });
}

export function resolveChannelIds(
  entry: TriggerConfigEntry,
  env: Record<string, string | undefined>,
): string[] {
  if (entry.scope === "global") return [];

  if (entry.channels.length > 0) {
    return [...entry.channels];
  }

  const override = env.SLACK_TRIGGER_CHANNEL_IDS?.trim();
  if (!override) return [];

  return override
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

export async function loadTriggerDefinition(
  triggerDefPath: string,
  baseDir: string,
): Promise<Record<string, unknown>> {
  const fullPath = join(baseDir, triggerDefPath);
  const module = await import(`file://${fullPath}`);
  const trigger = module.default;
  if (!trigger || typeof trigger !== "object") {
    throw new Error(`Trigger def ${triggerDefPath} must default-export an object`);
  }
  return { ...(trigger as Record<string, unknown>) };
}

export async function loadTriggerTitle(
  triggerDefPath: string,
  baseDir: string,
): Promise<string> {
  const trigger = await loadTriggerDefinition(triggerDefPath, baseDir);
  const name = trigger.name;
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(`Trigger def ${triggerDefPath} must include a name`);
  }
  return name.trim();
}

export async function writeTriggerDefinitionFile(
  trigger: Record<string, unknown>,
  outputPath: string,
): Promise<string> {
  await Deno.writeTextFile(outputPath, JSON.stringify(trigger, null, 2));
  return outputPath;
}

export function buildProvisionTitle(
  baseName: string,
  scope: TriggerScope,
  channelId?: string,
): string {
  if (scope === "global" || !channelId) return baseName;
  return `${baseName} (${channelId})`;
}

export function buildProvisionDescription(
  configId: string,
  scope: TriggerScope,
  channelId?: string,
): string {
  const channelSuffix = channelId ? `:${channelId}` : "";
  return `ci:trigger:${configId}:${scope}${channelSuffix}`;
}

export async function expandProvisionTargets(
  config: TriggersConfig,
  env: Record<string, string | undefined>,
  baseDir: string,
): Promise<ProvisionTarget[]> {
  const targets: ProvisionTarget[] = [];

  for (const entry of config.triggers) {
    if (!entry.enabled) continue;

    const baseName = await loadTriggerTitle(entry.trigger_def, baseDir);
    const channelIds = resolveChannelIds(entry, env);

    if (entry.scope === "channel" && channelIds.length === 0) {
      continue;
    }

    if (entry.scope === "global") {
      targets.push({
        configId: entry.id,
        triggerDef: entry.trigger_def,
        scope: entry.scope,
        title: buildProvisionTitle(baseName, entry.scope),
        description: buildProvisionDescription(entry.id, entry.scope),
      });
      continue;
    }

    for (const channelId of channelIds) {
      targets.push({
        configId: entry.id,
        triggerDef: entry.trigger_def,
        scope: entry.scope,
        channelId,
        title: buildProvisionTitle(baseName, entry.scope, channelId),
        description: buildProvisionDescription(
          entry.id,
          entry.scope,
          channelId,
        ),
      });
    }
  }

  return targets;
}

export interface ListedTrigger {
  id: string;
  title: string;
  description?: string;
}

/** Parse `slack trigger list` text output into trigger records. */
export function parseTriggerListOutput(output: string): ListedTrigger[] {
  const triggers: ListedTrigger[] = [];
  const linePattern = /^\s{3}(.+?)\s+(Ft[A-Z0-9]+)\s+\(shortcut\)/;

  for (const line of output.split("\n")) {
    const match = line.match(linePattern);
    if (!match) continue;
    triggers.push({ title: match[1].trim(), id: match[2] });
  }

  return triggers;
}

export function findMatchingTrigger(
  listed: ListedTrigger[],
  target: ProvisionTarget,
): ListedTrigger | undefined {
  return listed.find((trigger) => trigger.title === target.title);
}
