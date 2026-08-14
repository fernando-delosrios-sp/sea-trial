# Design: Simplify Channel Composition

## Context

Sea Trial provisions TES Event Channels via `content/channels/tes-event.json` and `channel-provisioner.ts`. The current multi-plane manifest (resources, chrome, gates, modals, navigation, runtime maps) duplicates object declarations and carries unused configuration. Exploration converged on a minimal model: ordered `steps[]` with create/link semantics and opt-in `tab` / `bookmark` surfacing. Slack list channel tabs are unavailable; lists surface via explicit `bookmarks.add`. Bookmark folders have no documented creation API.

## Goals / Non-Goals

**Goals:**

- Replace multi-plane manifest with single `steps[]` array
- Opt-in `tab: true` for channel tabs (canvases)
- Opt-in `bookmark: true` for Bookmarks bar links (lists)
- `kind: workflow` with `link` for app-defined workflows registered per channel
- JSON Schema conditional validation per kind
- Preserve existing provisioning outcomes for `tes-event` (same canvases, lists, onboarding shortcut, pinned index)
- Derive pinned index navigation from steps (order + `title`)

**Non-Goals:**

- Bookmark folder nesting via `parent_id`
- Migrating `TesEventContext` to `slots: Record<string, string>` only
- Wiring gates from manifest
- Additional channel types beyond `tes-event`
- Removing kind registry (may simplify usage but registry stays)

## Decisions

### D1: Single `steps[]` replaces all planes

- **Choice:** One ordered array; each step has `id`, `kind`, and kind-specific fields
- **Reason:** Authors think in provisioning sequence, not resources-vs-chrome split
- **Considered alternatives:** Keep planes (rejected — artificial split); phased arrays create/organize/link (rejected — less flexible)

### D2: Opt-in surfacing flags

- **Choice:** `tab: true` creates channel tab; `bookmark: true` adds bookmark link; absent = neither
- **Reason:** Presence means "do"; no explicit false in manifest
- **Considered alternatives:** Boolean pairs with false explicit (rejected — noisy); kind defaults only without schema (rejected — less visible in JSON)

### D3: List attachment via bookmark only

- **Choice:** When `bookmark: true`, call `bookmarks.add` after `slackLists.create` + `access.set`; skip list tab API probes
- **Reason:** Spike confirmed no public list-tab API; bookmarks are the approved fallback
- **Considered alternatives:** Keep tab probe then fallback (rejected — adds latency and false hope)

### D4: Workflow steps link app assets

- **Choice:** `kind: workflow`, `link: "open_onboarding_workflow"` creates channel-scoped trigger; modal content stays in `content/modals/`
- **Reason:** Workflow exists at deploy time; channel step registers access
- **Considered alternatives:** `kind: modal` in manifest (rejected — modal is not a channel object)

### D5: Context ID bridge without manifest map

- **Choice:** Provisioner maps step `id` to existing `TesEventContext` fields via internal convention table (same mapping as today’s `context_slot_map`)
- **Reason:** Non-breaking shared types; manifest stays structure-only
- **Considered alternatives:** Keep `runtime.context_slot_map` in JSON (rejected — plumbing not structure); migrate to slots record (deferred)

### D6: Pinned index from steps

- **Choice:** Include steps that have `title` and a provisioned ID in pinned index, in `steps` order; canvases and lists use existing link builders
- **Reason:** Removes `navigation.entries` duplication
- **Considered alternatives:** Keep navigation block (rejected); hardcode index in message template (rejected — loses declarative order)

### D7: Kind-scoped JSON Schema

- **Choice:** `composition.schema.json` uses `if/then` on `kind` to allow `tab`, `bookmark`, or `link` appropriately; reject invalid combinations
- **Reason:** IDE validation without tribal knowledge
- **Considered alternatives:** Runtime-only validation (rejected — late failure)

## Risks / Trade-offs

- [Risk] Pinned index order/labels drift from current navigation → Mitigation: migration test comparing rendered links before/after for tes-event fixture
- [Risk] Breaking embed-content and composition tests → Mitigation: update in same PR; run `deno task test` in slack-app
- [Trade-off] Internal id→context convention hidden from JSON → Accepted; document in resolver, path to slots migration later
- [Trade-off] No bookmark folders → Accepted until Slack API exists

## Migration Plan

1. Add new schema and resolver support for `steps[]` (parallel parse if needed during transition)
2. Rewrite `tes-event.json` to agreed shape
3. Refactor provisioner to iterate steps; apply tab/bookmark flags
4. Update message renderer to derive navigation from steps
5. Remove dead manifest fields from schema and embedded content
6. Update tests and README
7. Run `deno task test` in `slack-app/`; smoke checklist unchanged for user-visible objects

Rollback: revert manifest and provisioner; restore previous `tes-event.json` from git.

## Open Questions

- None blocking — pinned index derivation rule locked to steps with `title` in manifest order.
