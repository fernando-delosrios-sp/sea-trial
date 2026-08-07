# Design: Channel Composition Engine

## Context

Domain JSON and declarative UI content are in place (`declarative-slack-content`). Channel structure — which objects constitute a TES Event Channel and in what order they are provisioned — remains hardcoded in `seed_channel_objects/mod.ts` with manual pinned-index links and flat `TesEventContext` field wiring.

## Goals / Non-Goals

**Goals:**

- Single composition manifest (`content/channels/tes-event.json`) defining resources, chrome, gates, modals, navigation, and dynamic resources
- Extensible kind registry (`content/kinds/*.v1.json`) with `api_availability` gating
- `channel-provisioner.ts` orchestrates creates; `seed_channel_objects` becomes thin executor
- Slot-based linking via `runtime.context_slot_map` bridging to flat `TesEventContext` fields
- Navigation auto-generation for pinned index from `navigation.entries`
- JSON Schema validation and tests for composition shape and provisioning order (topological sort on `depends_on`)

**Non-Goals:**

- Slack UI channel templates
- `TesEventContext.slots`-only migration (bridge map only)
- Additional channel types beyond `tes-event` MVP
- List behavior Phase 2/3

## Decisions

### D1: Single manifest per channel type

**Choice:** `content/channels/tes-event.json` for MVP; future types add sibling manifests.

**Reason:** One declarative answer to "what is a TES Event Channel?"

### D2: Open kind registry

**Choice:** `content/kinds/{canvas,list,message,modal}.v1.json`; unknown kinds skipped when `api_availability !== "stable"`.

**Reason:** Extend for folders, bookmarks, featured workflows without schema rewrite.

### D3: Slot bridge to flat context

**Choice:** `runtime.context_slot_map` maps slot names to existing `TesEventContext` field names.

**Reason:** Non-breaking; path to future `slots: Record<string, string>` documented.

### D4: Topological provisioning order

**Choice:** `depends_on` on resource entries; resolver performs topological sort before provision.

**Reason:** Dashboard must embed metadata after peer resource IDs exist.

### D5: Navigation-driven pinned index

**Choice:** `navigation.entries` drives link lines in pinned index message; message template unchanged.

**Reason:** Add indexed object = one composition entry.

### D6: Manual JSON validation

**Choice:** Schema under `slack-app/schemas/content/composition.schema.json`; validate in resolver (same pattern as domain/modal loaders).

**Reason:** Consistent with repo; no new runtime dependency.

## Risks / Trade-offs

- [Risk] Composition drift from actual seed behavior → Mitigation: port existing seed order and slot map to manifest; composition tests assert order
- [Trade-off] Gates declared but not yet consumed by all handlers → Accepted; declarative config for future enforcement

## Migration Plan

1. Add composition manifest, kind registry, resolver, provisioner
2. Refactor `seed_channel_objects` to call provisioner
3. Update message renderer for navigation entries
4. Add optional `channelType` / `compositionVersion` to context
5. Run `npm test`; archive change

Rollback: revert provisioner; restore inline seed orchestration.

## Open Questions

None — scope locked in brainstorm.
