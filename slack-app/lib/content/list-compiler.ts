import { getDeliverableStatusChoices } from "./domain.ts";
import { readContentJson } from "./paths.ts";

export interface ListColumnOption {
  value: string;
  label: string;
}

export interface ListColumnDefinition {
  key: string;
  name: string;
  type: string;
  options?: ListColumnOption[];
}

export interface SlackListColumn {
  name: string;
  type: string;
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

function resolveOptionsRef(ref: string): ListColumnOption[] {
  if (ref === "@domain/deliverable-statuses") {
    return getDeliverableStatusChoices().map((choice) => ({
      value: choice.value,
      label: choice.label,
    }));
  }
  throw new Error(`Unknown options_ref: ${ref}`);
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

  const columns: ListColumnDefinition[] = columnsRaw.map((col, index) => {
    if (!col || typeof col !== "object") {
      throw new Error(`${source} columns[${index}] must be an object`);
    }
    const column = col as Record<string, unknown>;
    const key = requireString(column, "key", `${source} columns[${index}]`);
    const colName = requireString(column, "name", `${source} columns[${index}]`);
    const type = requireString(column, "type", `${source} columns[${index}]`);

    let options: ListColumnOption[] | undefined;
    if (column.options_ref !== undefined) {
      if (typeof column.options_ref !== "string") {
        throw new Error(`${source} columns[${index}].options_ref must be a string`);
      }
      options = resolveOptionsRef(column.options_ref);
    } else if (column.options !== undefined) {
      if (!Array.isArray(column.options)) {
        throw new Error(`${source} columns[${index}].options must be an array`);
      }
      options = column.options.map((opt, optIndex) => {
        if (!opt || typeof opt !== "object") {
          throw new Error(`${source} columns[${index}].options[${optIndex}] must be an object`);
        }
        const option = opt as Record<string, unknown>;
        return {
          value: requireString(option, "value", `${source} option`),
          label: requireString(option, "label", `${source} option`),
        };
      });
    }

    return { key, name: colName, type, options };
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

/** Returns Slack API schema columns (name + type) for list creation. */
export function getSlackListSchema(listName: string): SlackListColumn[] {
  return loadList(listName).columns.map((column) => ({
    name: column.name,
    type: column.type,
  }));
}

/** Returns the display name for a list definition. */
export function getListName(listName: string): string {
  return loadList(listName).name;
}

/** Deliverables list columns — backward-compatible export. */
export const DELIVERABLES_COLUMNS = getSlackListSchema("deliverables");

/** Incidents list columns — backward-compatible export. */
export const INCIDENTS_COLUMNS = getSlackListSchema("incidents");

/** Resolved status options for Deliverables list — for tests and future behavior. */
export function getDeliverablesStatusOptions(): ListColumnOption[] {
  const statusColumn = getListColumns("deliverables").find((c) => c.key === "status");
  return statusColumn?.options ?? [];
}
