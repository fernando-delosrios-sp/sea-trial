import type { OnboardingForm, TesEventContext } from "@sea-trial/shared/types/index.ts";

export const METADATA_MARKER = "<!-- tes-event-context -->";

export const MISSING_ONBOARDING_SNAPSHOT_ERROR =
  "Onboarding is missing a trigger context snapshot. Re-run Create TES Event, or repair with TES_EVENT_CONTEXT_JSON.";

/**
 * Compact JSON snapshot for Onboarding Link Trigger inputs and pinned button values.
 */
export function serializeEventContextSnapshot(context: TesEventContext): string {
  return JSON.stringify(context);
}

/**
 * Serializes `TesEventContext` into a Dashboard canvas metadata JSON block.
 */
export function serializeEventContext(context: TesEventContext): string {
  const json = JSON.stringify(context, null, 2);
  return `${METADATA_MARKER}\n\`\`\`json\n${json}\n\`\`\``;
}

function parseContextObject(json: string): TesEventContext | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as TesEventContext;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Deserializes `TesEventContext` from compact JSON or Dashboard metadata markdown.
 * @returns Parsed context or null if the payload is missing or invalid
 */
export function deserializeEventContext(
  canvasMarkdown: string,
): TesEventContext | null {
  const trimmed = canvasMarkdown.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    return parseContextObject(trimmed);
  }

  const markerIndex = trimmed.indexOf(METADATA_MARKER);
  if (markerIndex === -1) return null;

  const afterMarker = trimmed.slice(markerIndex + METADATA_MARKER.length);
  const match = afterMarker.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match?.[1]) return null;

  return parseContextObject(match[1]);
}

/**
 * Updates onboarding fields on an existing context after form submission.
 */
export function applyOnboarding(
  context: TesEventContext,
  form: OnboardingForm,
  derivedComponents: string[],
): TesEventContext {
  return {
    ...context,
    accountName: form.accountName,
    onboardingComplete: true,
    onboarding: form,
    derivedComponents,
  };
}

