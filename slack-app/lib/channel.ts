/** Maximum Slack channel name length (includes # prefix in display, not in API name). */
const MAX_CHANNEL_NAME_LENGTH = 80;

/** Reserved Slack channel name segments. */
const RESERVED = new Set(["general", "random", "here", "channel", "everyone"]);

/**
 * Converts a project name to a valid Slack channel slug segment.
 * @param projectName - User-provided project name
 * @returns Lowercase slug suitable for `#proj-{slug}-tes`
 */
export function slugifyProjectName(projectName: string): string {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Builds the full TES event channel name from a project name.
 * @param projectName - User-provided project name
 * @returns Channel name without leading `#`, e.g. `proj-acme-corp-tes`
 */
export function buildChannelName(projectName: string): string {
  const slug = slugifyProjectName(projectName);
  return `proj-${slug}-tes`;
}

export interface ChannelNameValidation {
  valid: boolean;
  channelName?: string;
  error?: string;
}

/**
 * Validates whether a project name produces a valid Slack channel name.
 */
export function validateChannelName(projectName: string): ChannelNameValidation {
  const trimmed = projectName.trim();

  if (!trimmed) {
    return { valid: false, error: "Project name is required." };
  }

  const slug = slugifyProjectName(trimmed);

  if (!slug) {
    return {
      valid: false,
      error: "Project name must contain at least one letter or number.",
    };
  }

  if (RESERVED.has(slug)) {
    return {
      valid: false,
      error: `"${slug}" is a reserved name and cannot be used.`,
    };
  }

  const channelName = buildChannelName(trimmed);

  if (channelName.length > MAX_CHANNEL_NAME_LENGTH) {
    return {
      valid: false,
      error: `Channel name is too long (${channelName.length} chars). Shorten the project name.`,
    };
  }

  return { valid: true, channelName };
}

/**
 * Builds the deduplicated list of user IDs to invite to a TES event channel:
 * all selected members plus the submitting/trigger user.
 * @param memberUserIds - User IDs selected via the multi_users_select field
 * @param submittingUserId - User ID of the person who submitted the creation form
 * @returns Ordered, deduplicated list of user IDs to invite
 */
export function buildInviteUserIds(
  memberUserIds: string[],
  submittingUserId: string,
): string[] {
  const seen = new Set(memberUserIds);
  const result = [...memberUserIds];

  if (!seen.has(submittingUserId)) {
    result.push(submittingUserId);
  }

  return result;
}

