import {
  validateListColumns,
} from "./capability-validator.ts";
import { resolveListOptionsRef } from "./domain-ref-resolver.ts";
import { readContentJson } from "./paths.ts";
import { finalizeSlackListSchema } from "./slack-list-schema.ts";

export interface ListColumnChoice {
  value: string;
  label: string;
  color?: string;
}

export interface ListColumnOptions {
  format?: string;
  choices?: ListColumnChoice[];
  [key: string]: unknown;
}

export interface ListColumnDefinition {
  key: string;
  name: string;
  type: string;
  is_primary_column?: boolean;
  options?: ListColumnOptions;
}

export interface SlackListColumn {
  key: string;
  name: string;
  type: string;
  is_primary_column?: boolean;
  options?: ListColumnOptions;
}

export interface ListDefinition {
  name: string;
  columns: ListColumnDefinition[];
  seed: { items: unknown[] };
  behavior: { field_change: unknown[] };
}

const LIST_FILES: Record<string, string> = {
  deliverables: "lists/deliverables.json",
  incidents: "lists/incidents.json",
};

let cachedLists: Map<string, ListDefinition> | null = null;

function normalizeInlineOptions(
  options: Record<string, unknown>,
  source: string,
): ListColumnOptions {
  const choicesRaw = options.choices;
  if (!Array.isArray(choicesRaw)) {
    throw new Error(`${source} options.choices must be an array`);
  }

  const choices = choicesRaw.map((opt, optIndex) => {
    if (!opt || typeof opt !== "object") {
      throw new Error(`${source} options.choices[${optIndex}] must be an object`);
    }
    const row = opt as Record<string, unknown>;
    const value = requireString(row, "value", `${source} choice`);
    const label = requireString(row, "label", `${source} choice`);
    const color = row.color;
    return {
      value,
      label,
      ...(typeof color === "string" ? { color } : {}),
    };
  });

  return {
    ...options,
    choices,
  } as ListColumnOptions;
}

function validateListDefinition(data: unknown, source: string): ListDefinition {
  if (!data || typeof data !== "object") {
    throw new Error(`${source} must be an object`);
  }
  const row = data as Record<string, unknown>;
  const name = requireString(row, "name", source);
  const columnsRaw = row.columns;
  if (!Array.isArray(columnsRaw) || columnsRaw.length === 0) {
    throw new Error(`${source} must contain a non-empty columns array`);
  }

  validateListColumns(columnsRaw, source);

  const columns: ListColumnDefinition[] = columnsRaw.map((col, index) => {
    const column = col as Record<string, unknown>;
    const colSource = `${source} columns[${index}]`;
    const key = requireString(column, "key", colSource);
    const colName = requireString(column, "name", colSource);
    const type = requireString(column, "type", colSource);

    let options: ListColumnOptions | undefined;
    if (column.options_ref !== undefined) {
      options = resolveListOptionsRef(column.options_ref as string);
    } else if (column.options !== undefined) {
      const optionsObj = column.options as Record<string, unknown>;
      if (type === "select" || type === "multi_select") {
        options = normalizeInlineOptions(optionsObj, colSource);
      } else {
        options = optionsObj as ListColumnOptions;
      }
    }

    const isPrimaryColumn = column.is_primary_column === true;

    return {
      key,
      name: colName,
      type,
      ...(isPrimaryColumn ? { is_primary_column: true } : {}),
      options,
    };
  });

  const seed = row.seed;
  if (!seed || typeof seed !== "object" || !Array.isArray((seed as Record<string, unknown>).items)) {
    throw new Error(`${source} must contain seed.items array`);
  }

  const behavior = row.behavior;
  if (
    !behavior || typeof behavior !== "object" ||
    !Array.isArray((behavior as Record<string, unknown>).field_change)
  ) {
    throw new Error(`${source} must contain behavior.field_change array`);
  }

  return {
    name,
    columns,
    seed: { items: (seed as Record<string, unknown>).items as unknown[] },
    behavior: {
      field_change: (behavior as Record<string, unknown>).field_change as unknown[],
    },
  };
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

function loadList(name: string): ListDefinition {
  if (!cachedLists) {
    cachedLists = new Map();
  }
  const cached = cachedLists.get(name);
  if (cached) return cached;

  const relativePath = LIST_FILES[name];
  if (!relativePath) {
    throw new Error(`Unknown list: ${name}`);
  }

  const data = readContentJson(relativePath);
  const list = validateListDefinition(data, relativePath);
  cachedLists.set(name, list);
  return list;
}

/** Resets cached list definitions — for tests only. */
export function resetListCacheForTests(): void {
  cachedLists = null;
}

/** Parses and validates list JSON from raw string — for tests. */
export function parseListJson(raw: string, source = "list"): ListDefinition {
  return validateListDefinition(JSON.parse(raw), source);
}

/** Returns compiled column definitions for a list. */
export function getListColumns(listName: string): ListColumnDefinition[] {
  return [...loadList(listName).columns];
}

/** Returns Slack API schema columns for list creation. */
export function getSlackListSchema(listName: string): SlackListColumn[] {
  const schema = loadList(listName).columns.map((column) => {
    const slackColumn: SlackListColumn = {
      key: column.key,
      name: column.name,
      type: column.type,
    };
    if (column.is_primary_column) {
      slackColumn.is_primary_column = true;
    }
    if (column.options) {
      slackColumn.options = column.options;
    }
    return slackColumn;
  });
  return finalizeSlackListSchema(schema);
}

/** Returns the display name for a list definition. */
export function getListName(listName: string): string {
  return loadList(listName).name;
}

/** Returns declarative field_change behavior rules for a list. */
export function getListFieldChangeRules(listName: string): unknown[] {
  return [...loadList(listName).behavior.field_change];
}

/** Deliverables list columns — backward-compatible export. */
export const DELIVERABLES_COLUMNS = getSlackListSchema("deliverables");

/** Incidents list columns — backward-compatible export. */
export const INCIDENTS_COLUMNS = getSlackListSchema("incidents");

/** Resolved status options for Deliverables list — for tests and future behavior. */
export function getDeliverablesStatusOptions(): ListColumnChoice[] {
  const statusColumn = getListColumns("deliverables").find((c) => c.key === "status");
  return statusColumn?.options?.choices ?? [];
}
