export interface ListFieldChangeRule {
  column: string;
  value: string;
  function: string;
}

/** Parses and validates a field_change rule from list JSON. */
export function parseFieldChangeRule(raw: unknown): ListFieldChangeRule | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const column = typeof row.column === "string" ? row.column.trim() : "";
  const value = typeof row.value === "string" ? row.value.trim() : "";
  const fn = typeof row.function === "string" ? row.function.trim() : "";
  if (!column || !value || !fn) return null;
  return { column, value, function: fn };
}

/** Returns matching field_change function names for a column update. */
export function matchFieldChangeFunctions(
  rules: unknown[],
  column: string,
  newValue: string,
): string[] {
  const matches: string[] = [];
  for (const raw of rules) {
    const rule = parseFieldChangeRule(raw);
    if (!rule) continue;
    if (rule.column === column && rule.value === newValue) {
      matches.push(rule.function);
    }
  }
  return matches;
}
