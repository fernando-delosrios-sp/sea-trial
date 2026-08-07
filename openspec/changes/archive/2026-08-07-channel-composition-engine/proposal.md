## Why

Channel structure — which canvases, lists, messages, modals, and gates constitute a TES Event Channel — is hardcoded in `seed_channel_objects` with manual provisioning order and duplicated navigation links. That blocks adding objects (bookmarks, folders, featured workflows) without multi-file edits and hides the channel blueprint from spec and review. A declarative composition manifest with an extensible kind registry makes the channel blueprint explicit, ordered, and future-proof without relying on Slack UI channel templates.

## What Changes

**Channel composition manifest**
- From: Implicit object set in `seed_channel_objects/mod.ts`
- To: `content/channels/tes-event.json` defining resources, chrome, automation, organization, dynamic_resources, gates, modals, navigation
- Reason: Single declarative answer to "what is a TES Event Channel?"
- Impact: Non-breaking at Slack API level; internal refactor

**Kind registry**
- From: Hardcoded create functions per object type
- To: `content/kinds/*.v1.json` + dispatch in `channel-provisioner.ts`; unknown/future kinds skipped when `api_availability` is not stable
- Reason: Add folders, featured workflows, bookmarks without schema rewrite
- Impact: New extensibility layer

**Provisioner refactor**
- From: `seed_channel_objects` orchestrates creates inline
- To: Thin function calling `channel-provisioner` (topological sort, slot map, metadata write, pin message)
- Reason: Separation of blueprint vs execution
- Impact: `seed_channel_objects` becomes executor only

**Slot-based linking**
- From: Manual links in pinned index; flat context field names in code
- To: `slot` identifiers cross-referencing composition entries; `runtime.context_slot_map` bridges to `TesEventContext`
- Reason: Stable logical names vs runtime Slack IDs
- Impact: Non-breaking via bridge map

**Navigation auto-generation**
- From: `pinnedIndexMessage()` listing each object manually
- To: `navigation.entries` in composition driving rendered pinned message
- Reason: Add indexed object = one composition entry
- Impact: Absorbed by `declarative-slack-content` message template + composition data

## Capabilities

### New Capabilities

- `channel-composition`: Declarative channel blueprint (multi-plane manifest, kind registry, slot linking, provisioning order, gates) executed by a channel provisioner; extensible for future Slack native items (bookmarks, folders, featured workflows, channel tabs).

### Modified Capabilities

- `event-channel`: Channel object seeding SHALL be driven by a composition manifest and kind registry rather than hardcoded orchestration; object IDs SHALL be mapped to named slots with backward-compatible `TesEventContext` serialization.

## Impact

- **New:** `content/channels/tes-event.json`, `content/kinds/`, `lib/content/channel-provisioner.ts`, `lib/content/composition-resolver.ts`, `lib/content/kind-registry.ts`, composition schema + tests
- **Modified:** `seed_channel_objects`, `TesEventContext` serialization (add `channelType` / `compositionVersion` optional fields), specs for event-channel
- **Unchanged:** Agent-service, modal submit handlers (still code); content file formats (owned by `declarative-slack-content`)
- **Explicitly out:** Slack UI channel templates; list field-change Events API; slots-only context migration
- **Sequence:** Change 3 of 3 — depends on `declarative-slack-content`
