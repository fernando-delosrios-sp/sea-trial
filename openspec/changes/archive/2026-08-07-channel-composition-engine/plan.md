# Channel Composition Engine — Implementation Plan

**Goal:** Replace hardcoded channel seed orchestration with a declarative composition manifest, kind registry, and channel provisioner.

**Architecture:** Manifest under `slack-app/content/channels/`; kinds under `slack-app/content/kinds/`; resolver + registry + provisioner under `slack-app/lib/content/`; thin `seed_channel_objects` executor.

**Tech Stack:** Deno, manual JSON Schema validation, existing content loaders

**Canonical test commands:**

- Monorepo: `npm test` (from repo root)
- Slack-app: `cd slack-app && deno task test`

---

## Task 1: Composition content and schema

**Files:** `slack-app/content/channels/tes-event.json`, `slack-app/content/kinds/*.v1.json`, `slack-app/schemas/content/composition.schema.json`

- [ ] Create tes-event composition manifest with resources, chrome, gates, modals, navigation
- [ ] Create kind registry files for canvas, list, message, modal
- [ ] Add composition JSON Schema

---

## Task 2: Resolver and registry (TDD)

**Files:** `composition-resolver.ts`, `kind-registry.ts`, `composition_test.ts`

- [ ] Implement composition loader and validation
- [ ] Implement topological sort on `depends_on`
- [ ] Implement kind registry with `api_availability` gate
- [ ] Add composition tests

---

## Task 3: Channel provisioner and consumer refactor

**Files:** `channel-provisioner.ts`, `seed_channel_objects/mod.ts`, `message-renderer.ts`, `TesEventContext`

- [ ] Implement `provisionChannel` with slot map bridging
- [ ] Refactor seed function to thin executor
- [ ] Navigation auto-generation for pinned index
- [ ] Optional `channelType` / `compositionVersion` on context

---

## Task 4: Spec deltas and documentation

- [ ] Delta specs for `channel-composition` and `event-channel`
- [ ] Update README and CHANGELOG
- [ ] Mark tasks.md complete; write verify.md PASS
- [ ] Squash merge to main; `openspec archive channel-composition-engine -y`
