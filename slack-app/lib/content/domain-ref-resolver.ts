import { getRegisteredDomainRefEntry } from "./capability-catalog.ts";
import {
  getCompetitorChoices,
  getDeliverableStatusChoices,
  getProjectTypeChoices,
  getSupportedSuites,
} from "./domain.ts";

export interface ResolvedListColumnOptions {
  format?: string;
  choices?: Array<{ value: string; label: string; color?: string }>;
  [key: string]: unknown;
}

/** Resolves a registered `@domain/*` ref to Slack list select options. */
export function resolveListOptionsRef(ref: string): ResolvedListColumnOptions {
  const entry = getRegisteredDomainRefEntry(ref);
  if (!entry) {
    throw new Error(`Unknown options_ref: ${ref}`);
  }

  switch (entry.resolver) {
    case "deliverable-status-choices":
      return {
        format: entry.select_format ?? "single_select",
        choices: getDeliverableStatusChoices().map((choice) => ({
          value: choice.value,
          label: choice.label,
        })),
      };
    default:
      throw new Error(
        `No list options resolver for ${ref} (resolver: ${entry.resolver})`,
      );
  }
}

/** Resolves a registered `@domain/*` ref to Block Kit static_select options. */
export function resolveModalSelectOptionsRef(
  ref: string,
): Array<{ text: { type: string; text: string }; value: string }> {
  const entry = getRegisteredDomainRefEntry(ref);
  if (!entry) {
    throw new Error(`Unknown options_ref: ${ref}`);
  }

  switch (entry.resolver) {
    case "sailpoint-suite-names":
      return getSupportedSuites().map((suite) => ({
        text: { type: "plain_text", text: suite },
        value: suite,
      }));
    case "project-type-choices":
      return toModalSelectOptions(getProjectTypeChoices());
    case "competitor-choices":
      return toModalSelectOptions(getCompetitorChoices());
    default:
      throw new Error(
        `No modal select resolver for ${ref} (resolver: ${entry.resolver})`,
      );
  }
}

function toModalSelectOptions(
  choices: Array<{ value: string; label: string }>,
): Array<{ text: { type: string; text: string }; value: string }> {
  return choices.map((choice) => ({
    text: { type: "plain_text", text: choice.label },
    value: choice.value,
  }));
}
