import {
  isNameCollisionError,
  MAX_NAME_COLLISION_ATTEMPTS,
} from "./unique-resource-name.ts";

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
 * @param suffixAttempt - 0 for base name; 1+ appends counter to slug before `-tes` (e.g. `proj-acme1-tes`)
 * @returns Channel name without leading `#`, e.g. `proj-acme-corp-tes` or `proj-acme-corp1-tes`
 */
export function buildChannelName(
  projectName: string,
  suffixAttempt = 0,
): string {
  const slug = slugifyProjectName(projectName);
  const counter = suffixAttempt > 0 ? String(suffixAttempt) : "";
  return `proj-${slug}${counter}-tes`;
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
    create?: (params: {
      name: string;
      is_private: boolean;
    }) => Promise<CreateChannelResponse>;
    unarchive?: (params: { channel: string }) => Promise<{
      ok?: boolean;
      error?: string;
    }>;
  };
}

export interface CreateChannelResponse {
  ok?: boolean;
  error?: string;
  channel?: { id?: string };
  channel_id?: string;
}

/** Extracts a channel ID from a conversations.create response. */
export function extractChannelId(
  response: CreateChannelResponse,
): string | undefined {
  return response.channel?.id ?? response.channel_id;
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

/**
 * Looks up a reusable channel by name. Returns undefined when not found or when
 * listing fails (e.g. transient API errors — treat as ghost-taken and suffix).
 */
async function findReusableChannelByName(
  client: SlackChannelListClient,
  channelName: string,
): Promise<SlackChannelSummary | undefined> {
  try {
    return await findPublicChannelByName(client, channelName);
  } catch {
    return undefined;
  }
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

/**
 * Creates a TES event channel, reusing an existing public channel when found,
 * or trying `proj-{slug}1-tes`, `proj-{slug}2-tes`, … when the base name is
 * taken by a deleted (unlistable) channel.
 */
export async function createTesEventChannel(
  client: SlackChannelListClient,
  projectName: string,
): Promise<{ channelId: string; channelName: string }> {
  const validation = validateChannelName(projectName);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid project name");
  }

  for (let attempt = 0; attempt < MAX_NAME_COLLISION_ATTEMPTS; attempt++) {
    const channelName = buildChannelName(projectName, attempt);

    if (channelName.length > MAX_CHANNEL_NAME_LENGTH) {
      throw new Error(
        `Channel name is too long after ${attempt} collision retries. Shorten the project name.`,
      );
    }

    const create = client.conversations.create;
    if (typeof create !== "function") {
      throw new Error("Client does not support conversations.create");
    }

    const createResult = await create({
      name: channelName,
      is_private: false,
    });

    const createdChannelId = extractChannelId(createResult);
    if (createdChannelId && createResult.ok !== false) {
      return { channelId: createdChannelId, channelName };
    }

    if (!isNameCollisionError(createResult.error)) {
      throw new Error(createResult.error ?? "Failed to create channel");
    }

    const existing = await findReusableChannelByName(client, channelName);
    if (existing?.id && existing.is_archived) {
      try {
        await unarchiveChannelIfNeeded(client, existing);
        return { channelId: existing.id, channelName };
      } catch {
        // Archived channel cannot be reused — try proj-{slug}1-tes, …
        continue;
      }
    }

    // Name reserved (e.g. deleted channel) — try proj-{slug}1-tes, proj-{slug}2-tes, …
  }

  throw new Error(
    `Failed to create channel for "${projectName.trim()}" after ${MAX_NAME_COLLISION_ATTEMPTS} name attempts`,
  );
}

