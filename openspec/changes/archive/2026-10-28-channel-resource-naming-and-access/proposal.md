## Why

Slack canvases and lists exist at the workspace level. When provisioned with generic titles like "Dashboard" or "Deliverables", they collide across events and create confusing search results in Slack. Furthermore, while lists receive channel-scoped access, canvases currently do not have explicit channel write permissions set via canvases.access.set. This means new channel members must request permission or cannot edit event canvases. Suffixing resource titles with the channel name (e.g., Dashboard [proj-acme01-tes]) and setting channel-scoped write access on canvases ensures unambiguous resource organization and seamless, automatic access for all present and future channel members.

## What Changes

**Channel Resource Naming**
- From: Canvases titled with generic names (`Dashboard`, `Requirements`); lists titled with account prefix (`[Account] Deliverables`) or bare name.
- To: All provisioned canvases and lists titled with the channel name suffix (e.g. `Dashboard [proj-acme01-tes]`, `Deliverables [proj-acme01-tes]`).
- Reason: Avoid title collisions, provide clear workspace search attribution, and make resource ownership explicit.
- Impact: Non-breaking; newly provisioned event channels will use the suffixed title convention.

**Channel Bookmarks & Navigation Display Labels**
- From: Bookmarks and pinned index display whatever display name was allocated to the list or canvas.
- To: Channel bookmarks and pinned index links display clean base titles (`Dashboard`, `Deliverables`), while linking to the suffixed underlying resource.
- Reason: Clean in-channel navigation header while maintaining uniquely attributed backend resources.
- Impact: Non-breaking cosmetic improvement in channel header bookmarks.

**Canvas Channel-Scoped Access**
- From: Standalone canvases created with `canvases.create` without calling `canvases.access.set`, requiring manual sharing or individual grants.
- To: Newly provisioned canvases explicitly set channel-scoped write access via `canvases.access.set({ canvas_id, access_level: "write", channel_ids: [channelId] })`.
- Reason: Automatically grant edit access to all current and future members who join the channel.
- Impact: Non-breaking; new members joining `#proj-*-tes` can edit canvases immediately.

## Capabilities

### Modified Capabilities
- `event-channel`: Update channel object seeding to name lists and canvases with `<Base Title> [<channel-name>]` and grant channel-scoped write permissions to provisioned canvases.

## Impact

- `slack-app/lib/content/channel-provisioner.ts`: Update canvas and list provisioning steps to append channel suffix; call `canvases.access.set`.
- `slack-app/lib/canvas.ts`: Add `canvases.access.set` to client interface and helper.
- `slack-app/lib/lists.ts`: Ensure list title formatting accepts channel name and bookmark uses clean title.
- `slack-app/tests/channel_provisioner_test.ts`, `slack-app/tests/canvas_test.ts`, `slack-app/tests/lists_test.ts`: Update test mocks and assertions.
