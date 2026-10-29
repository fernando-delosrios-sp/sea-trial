## Context

During TES event delivery, Sea Trial seeds several Slack-native objects per channel: Dashboard, Requirements, Infrastructure, and Situation Report canvases, alongside Deliverables and Incidents lists. Because Slack treats canvases and lists as workspace-level assets, creating them without channel namespace causes name collisions, uninformative search results, and confusion when team members search across projects.

Additionally, team members join TES channels over time (e.g. solution engineers, partner architects, account executives). While lists are currently assigned channel-scoped access via `slackLists.access.set`, canvases created via `canvases.create` have no explicit channel access configured. New channel members therefore lack edit permissions unless explicitly shared.

## Goals / Non-Goals

**Goals:**
- Disambiguate all channel-provisioned canvases and lists by suffixing their titles with `[<channel-name>]` (e.g., `Dashboard [proj-acme01-tes]`).
- Preserve clean base display titles (`Dashboard`, `Deliverables`) for in-channel bookmarks and the pinned index message.
- Automatically grant write access for all provisioned canvases to the channel via `canvases.access.set({ access_level: "write", channel_ids: [channelId] })` so new channel members inherit permissions upon joining.

**Non-Goals:**
- Creating native channel tabs for lists or secondary canvases via API (prohibited by Slack Web API restrictions).
- Event-driven permission syncing via `member_joined_channel` triggers (unnecessary since channel-scoped access resolves permissions dynamically).
- Retroactively renaming or re-permissioning existing canvases in already-provisioned channels.

## Decisions

### D1: Suffix Format `<Base Title> [<channel-name>]`
- **Choice**: Format titles as `${baseTitle} [${channelName}]` (e.g., `Dashboard [proj-acme01-tes]`).
- **Reason**: The bracketed suffix is clean, human-readable, searchable in Slack, and leaves the base title prominent while unmistakably identifying the channel context.
- **Considered alternatives**:
  - Prefixing with account name (e.g., `Acme Deliverables`): Account names are optional or can be ambiguous when multiple events exist for the same account; doesn't match the channel handle.
  - Prefixing with channel slug (e.g., `[proj-acme01-tes] Dashboard`): Clutters the beginning of titles in compact Slack search dropdowns and lists views.

### D2: Decoupled Bookmark / Index Labels
- **Choice**: Pass the base title (e.g., `step.title ?? step.ref`) to `bookmarks.add` and pinned index blocks, while using the suffixed title for the underlying canvas or list.
- **Reason**: Within the channel context, repeating `[proj-acme01-tes]` in the header bookmark bar is redundant visual noise. Users already know what channel they are in.
- **Considered alternatives**:
  - Using the suffixed name for bookmarks: Makes bookmark tabs excessively wide, causing Slack to truncate them into overflow menus.

### D3: Channel-Scoped Canvas Access via `canvases.access.set`
- **Choice**: Call `canvases.access.set` with `access_level: "write"` and `channel_ids: [channelId]` immediately after canvas creation.
- **Reason**: Channel-scoped access is evaluated dynamically by Slack based on channel membership. New members added to the channel inherit access automatically with zero webhook/trigger overhead, and leaving members lose access.
- **Considered alternatives**:
  - Listening to `member_joined_channel` and adding users one-by-one: Fragile, requires extra scopes, incurs rate limits, and fails if the bot misses events.
  - Relying on default canvas inheritance: Standalone canvases created via API do not consistently grant edit access to all channel members across all Slack plan tiers.

## Risks / Trade-offs

- **[Risk] Slack API rate limits or errors on `canvases.access.set`** -> Mitigation: Wrap the access call with standard error handling; fail channel provisioning clearly if canvas access grant fails.
- **[Trade-off] Underlyling resource title is longer** -> Reason for acceptance: Essential for workspace-wide disambiguation and search clarity; bookmarks and pinned index keep in-channel view concise.

## Migration Plan

N/A — This change applies to newly provisioned TES Event Channels. Existing channels retain their current names and permissions without disruption.

## Open Questions

None.
