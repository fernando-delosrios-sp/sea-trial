## Scope

Suffix all provisioned TES Event Channel lists and canvases with the channel name (e.g. `[proj-acme01-tes]`), preserve clean base titles in channel bookmarks and pinned index navigation, and grant channel-scoped write access to provisioned canvases (`canvases.access.set`) so current and future channel members automatically inherit access.

## Language

**Channel Resource Title Suffix** (`draft`):
The bracketed channel name appended to the display title of a workspace-scoped Slack list or canvas created during channel provisioning (e.g., `Dashboard [proj-acme01-tes]`).
_Avoid_: channel tag, file prefix, slug suffix.

**Channel-Scoped Resource Access** (`draft`):
Access rights granted to a Slack list or canvas using the channel ID as the target entity, allowing any member of that channel—including members who join after creation—to inherit permissions dynamically.
_Avoid_: individual user grants, member join synchronization.

## Decisions

- **D1: Channel name suffix format**: Use `<Base Title> [<channel-name>]` (e.g., `Dashboard [proj-acme01-tes]`, `Deliverables [proj-acme01-tes]`). This keeps titles distinguishable and searchable across the Slack workspace while making ownership unmistakable.
- **D2: Clean channel bookmark & pinned index labels**: While the underlying Slack file/entity title carries the channel suffix, channel bookmarks (`bookmarks.add`) and pinned index links display the clean base title (e.g., `Dashboard`, `Deliverables`).
- **D3: Channel-scoped canvas permissions**: Call `canvases.access.set` with `access_level: "write"` and `channel_ids: [channelId]` immediately after canvas creation, mirroring existing list access behavior. This delegates member permissions to Slack's native channel membership roster.
- **D4: No native tab injection**: Native tabs for lists and arbitrary canvases cannot be injected programmatically via public Slack Web API. We rely on channel bookmarks and the pinned index for in-channel navigation.

## Open questions

_None. All forks resolved during verbal discovery._

## Scenarios discussed

- New member joins channel: Automatically inherits write access to all channel-scoped canvases and lists without bot intervention.
- Member leaves channel: Automatically loses access through Slack's native channel membership evaluation.
- Workspace search: Users searching for "Dashboard" or "Deliverables" in Slack can immediately identify which project channel owns each item.
- Name collision retry: If `Dashboard [proj-acme01-tes]` already exists, collision retry suffixes with numeric counter (e.g. `Dashboard [proj-acme01-tes]1`).
