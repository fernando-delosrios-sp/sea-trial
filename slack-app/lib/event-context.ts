import type { OnboardingForm, TesEventContext } from "@tes/shared/types/index.ts";

export const METADATA_MARKER = "<!-- tes-event-context -->";

/**
 * Serializes `TesEventContext` into a Dashboard canvas metadata JSON block.
 */
export function serializeEventContext(context: TesEventContext): string {
  const json = JSON.stringify(context, null, 2);
  return `${METADATA_MARKER}\n\`\`\`json\n${json}\n\`\`\``;
}

/**
 * Deserializes `TesEventContext` from Dashboard canvas markdown content.
 * @returns Parsed context or null if metadata block is missing/invalid
 */
export function deserializeEventContext(
  canvasMarkdown: string,
): TesEventContext | null {
  const markerIndex = canvasMarkdown.indexOf(METADATA_MARKER);
  if (markerIndex === -1) return null;

  const afterMarker = canvasMarkdown.slice(markerIndex + METADATA_MARKER.length);
  const match = afterMarker.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match?.[1]) return null;

  try {
    return JSON.parse(match[1]) as TesEventContext;
  } catch {
    return null;
  }
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
    onboardingComplete: true,
    onboarding: form,
    derivedComponents,
  };
}
