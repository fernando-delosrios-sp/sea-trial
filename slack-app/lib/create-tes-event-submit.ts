import { validateChannelName } from "./channel.ts";

/** Shape of `view.state.values` for a modal whose elements all use `action_id: "value"`. */
export type ViewStateValues = Record<
  string,
  Record<string, { value?: string; selected_users?: string[] }>
>;

export interface CreateTesEventSubmission {
  projectName: string;
  accountName: string;
  salesforceOpportunityUrl: string;
  memberUserIds: string[];
  contextNotes: string;
}

export type CreateTesEventSubmissionResult =
  | { valid: true; channelName: string; data: CreateTesEventSubmission }
  | { valid: false; errors: Record<string, string> };

function getText(values: ViewStateValues, blockId: string): string {
  return values[blockId]?.value?.value?.trim() ?? "";
}

function getSelectedUsers(values: ViewStateValues, blockId: string): string[] {
  return values[blockId]?.value?.selected_users ?? [];
}

/**
 * Parses the "Create TES Event" modal submission and validates the project
 * name up front so no channel is created for a name that can't produce a
 * usable Slack channel slug.
 */
export function parseCreateTesEventSubmission(
  values: ViewStateValues,
): CreateTesEventSubmissionResult {
  const projectName = getText(values, "project_name");
  const validation = validateChannelName(projectName);

  if (!validation.valid || !validation.channelName) {
    return {
      valid: false,
      errors: {
        project_name: validation.error ?? "Invalid project name.",
      },
    };
  }

  return {
    valid: true,
    channelName: validation.channelName,
    data: {
      projectName,
      accountName: getText(values, "account"),
      salesforceOpportunityUrl: getText(values, "salesforce_url"),
      memberUserIds: getSelectedUsers(values, "members"),
      contextNotes: getText(values, "context_notes"),
    },
  };
}
