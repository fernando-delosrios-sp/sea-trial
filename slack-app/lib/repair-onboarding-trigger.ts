import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { deserializeEventContext } from "./event-context.ts";

export const MISSING_REPAIR_SNAPSHOT_ERROR =
  "Set TES_EVENT_CONTEXT_JSON to a compact TesEventContext snapshot. Canvas content cannot be read; re-run Create TES Event if you do not have the snapshot.";

export const INVALID_REPAIR_SNAPSHOT_ERROR =
  "TES_EVENT_CONTEXT_JSON is not a valid TesEventContext snapshot";

/**
 * Reads an explicit trigger context snapshot from repair env.
 * Does not read canvas markdown.
 */
export function resolveRepairEventContext(
  env: Record<string, string | undefined>,
): TesEventContext {
  const json = env["TES_EVENT_CONTEXT_JSON"]?.trim();
  if (!json) {
    throw new Error(MISSING_REPAIR_SNAPSHOT_ERROR);
  }

  const context = deserializeEventContext(json);
  if (!context) {
    throw new Error(INVALID_REPAIR_SNAPSHOT_ERROR);
  }

  return context;
}
