## Why

The TES Event channel manifest (`tes-event.json`) declares seven conceptual planes—resources, chrome, gates, modals, navigation, automation, and runtime maps—but most are unused, duplicated, or enforced only in TypeScript. Adding a canvas or list requires editing the same object in three places (resource entry, context slot map, navigation entry). Authors cannot tell which fields actually drive provisioning versus aspirational config. This change collapses the blueprint to what channel deployment truly needs: ordered steps that create or link Slack objects and opt-in surfacing via tabs and bookmarks.

## What Changes

**Channel manifest shape**
- From: Multi-plane manifest with `resources`, `chrome`, `gates`, `modals`, `navigation`, `runtime.context_slot_map`, `automation`, `dynamic_resources`, `organization`
- To: Single ordered `steps[]` with `id`, `kind`, `ref` or `link`, optional `title`, opt-in `tab`, opt-in `bookmark`
- Reason: Match author mental model (create/link resources + surface in channel)
- Impact: Breaking change to manifest JSON and composition resolver types; provisioner behavior preserved

**Tab surfacing**
- From: `channel_tab: false` on some canvas entries (default true implied)
- To: `"tab": true` only when a channel tab should be created; absent = no tab
- Reason: Opt-in flags are clearer than explicit false
- Impact: Non-breaking for behavior if migrated correctly

**List channel attachment**
- From: Implicit bookmark attach after failed tab API probe in list handler
- To: `"bookmark": true` on list steps triggers explicit `bookmarks.add` after create
- Reason: Surfacing is declarative; list tabs unavailable on Slack API today
- Impact: Non-breaking for seeded channels when tes-event steps retain bookmark flags

**Removed from manifest (not deleted from product)**
- From: `gates`, `modals`, `navigation`, `organization`, `dynamic_resources` in JSON
- To: Gates/modals stay in code and content files; pinned index derived from steps; delivery canvas remains post-create workflow
- Reason: These are not channel structure
- Impact: Spec requirements updated; tests and resolver simplified

**JSON Schema**
- From: Generic provision entry schema for all planes
- To: Conditional schema per `kind` controlling allowed `tab`, `bookmark`, `link` fields
- Reason: Prevent invalid combinations at authoring time
- Impact: Non-breaking for consumers; stricter validation

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `channel-composition`: Replace multi-plane manifest with `steps[]` model; opt-in `tab` and `bookmark`; kind-scoped JSON Schema; remove navigation and context_slot_map from manifest requirements; derive pinned index from steps
- `event-channel`: Update seeding requirement to reference simplified manifest and bookmark-opt-in list attachment (no list tabs)

## Impact

- `slack-app/content/channels/tes-event.json` — rewritten to `steps[]` shape
- `slack-app/schemas/content/composition.schema.json` — new schema with kind conditionals
- `slack-app/lib/content/composition-resolver.ts` — parse/validate steps, id registry, slot bridge convention
- `slack-app/lib/content/channel-provisioner.ts` — single-step loop; tab/bookmark flags
- `slack-app/lib/lists.ts` — bookmark attach driven by manifest flag, drop tab probe when bookmark-only
- `slack-app/lib/content/message-renderer.ts` — derive pinned index from steps
- `slack-app/scripts/embed-content.ts`, embedded content artifacts — updated manifest
- `slack-app/tests/composition_test.ts`, related tests — updated assertions
- `README.md` channel composition section — document new shape
- `openspec/specs/channel-composition/spec.md`, `openspec/specs/event-channel/spec.md` — synced on archive
