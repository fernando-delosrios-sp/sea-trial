# Declarative Slack Content — Implementation Plan

**Goal:** Externalize modals, lists, canvases, and messages to content files with validated loaders.

**Architecture:** Content under `slack-app/content/`; compilers under `slack-app/lib/content/`; consumers call loaders only.

**Tech Stack:** Deno, Handlebars (`npm:handlebars`), JSON Schema (manual validation)

**Canonical test commands:**
- Monorepo: `npm test` (from repo root)
- Slack-app: `cd slack-app && deno task test`

---

## Task 1: Content files

**Files:** `slack-app/content/modals|lists|canvases|messages/`

- [ ] Create modal JSON with `contract.block_ids`
- [ ] Create list JSON with column keys and `@domain` refs
- [ ] Create canvas Handlebars templates
- [ ] Create pinned index Handlebars JSON template

---

## Task 2: Loaders (TDD)

**Files:** `slack-app/lib/content/*.ts`, `slack-app/schemas/content/`

- [ ] Add schema files and validation helpers
- [ ] Implement modal-compiler, canvas-renderer, list-compiler, message-renderer
- [ ] Add `slack_content_test.ts`

---

## Task 3: Refactor consumers

- [ ] `open_create_tes_event/mod.ts` → modal compiler
- [ ] `onboarding-modal.ts` → modal compiler + dynamic overlay
- [ ] `lists.ts` → list compiler
- [ ] `seed_channel_objects`, `onboarding-submit` → canvas/message renderers
- [ ] Delete `templates/index.ts`

---

## Task 4: Documentation and archive

- [ ] Update README and CHANGELOG
- [ ] Mark tasks.md complete; write verify.md PASS
- [ ] Squash merge to main; `openspec archive declarative-slack-content -y`
