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

export interface SlackChannelSummary {
  id?: string;
  name?: string;
  is_archived?: boolean;
}

export interface SlackChannelListClient {
  conversations: {
    list: (params: {
      types?: string;
      exclude_archived?: boolean;
      limit?: number;
      cursor?: string;
    }) => Promise<{
      ok?: boolean;
      channels?: SlackChannelSummary[];
      response_metadata?: { next_cursor?: string };
      error?: string;
    }>;
    unarchive?: (params: { channel: string }) => Promise<{
      ok?: boolean;
      error?: string;
    }>;
  };
}

/** Finds a public channel by exact name, including archived channels. */
export async function findPublicChannelByName(
  client: SlackChannelListClient,
  channelName: string,
): Promise<SlackChannelSummary | undefined> {
  let cursor: string | undefined;

  do {
    const response = await client.conversations.list({
      types: "public_channel",
      exclude_archived: false,
      limit: 200,
      ...(cursor ? { cursor } : {}),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to list channels${response.error ? `: ${response.error}` : ""}`,
      );
    }

    const match = response.channels?.find((channel) =>
      channel.name === channelName
    );
    if (match?.id) return match;

    cursor = response.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return undefined;
}

/** Unarchives a channel when the Slack API supports it. */
export async function unarchiveChannelIfNeeded(
  client: SlackChannelListClient,
  channel: SlackChannelSummary,
): Promise<void> {
  if (!channel.is_archived || !channel.id) return;

  const unarchive = client.conversations.unarchive;
  if (typeof unarchive !== "function") {
    throw new Error(
      `Channel #${channel.name} is archived — unarchive it in Slack or choose a different project name`,
    );
  }

  const response = await unarchive({ channel: channel.id });
  if (!response.ok) {
    throw new Error(
      `Failed to unarchive #${channel.name}${response.error ? `: ${response.error}` : ""}`,
    );
  }
}

