# Implementation Plan: simplify-channel-composition

**Goal:** Collapse `tes-event.json` to ordered `steps[]` with opt-in `tab` and `bookmark`; refactor resolver, provisioner, and pinned index; preserve seeding behavior.

**Canonical test command:** `cd slack-app && deno task test`

**Architecture reference:** `design.md`, delta specs under `specs/`

---

## Task 1.1 — Composition JSON Schema

**Files:** `slack-app/schemas/content/composition.schema.json`

1. Replace root required fields: `version`, `steps` (remove `runtime`, `resources`, `navigation`, etc.)
2. Define step object: required `id`, `kind`, `ref` OR `link` per kind
3. Add `if/then` branches:
   - `canvas`: optional `title`, optional `tab` with `const: true`
   - `list`: optional `title`, optional `bookmark` with `const: true`
   - `workflow`: required `link`, forbid `tab`/`bookmark`/`ref`
4. Run schema validation test manually via resolver parse test (Task 5.1)

**Commit:** `refactor(schema): steps-based composition schema`

---

## Task 1.2–1.4 — Resolver and manifest

**Files:** `composition-resolver.ts`, `tes-event.json`

1. **RED:** Update `composition_test.ts` — expect `steps.length === 7`, fail on old planes
2. Define `CompositionStep` interface; replace `CompositionManifest` planes with `steps: CompositionStep[]`
3. Implement `ID_TO_CONTEXT_FIELD` map (current slot map values keyed by step id)
4. Replace `applySlotIds` to use step `id`
5. Rewrite `tes-event.json` to brainstorm agreed JSON
6. **GREEN:** manifest load test passes

**Commit:** `refactor(composition): parse steps manifest and id bridge`

---

## Task 2.1–2.5 — Provisioner refactor

**Files:** `channel-provisioner.ts`, `lists.ts`

1. **RED:** Adjust provisioner integration test for steps order (same create order as today)
2. Single loop over `composition.steps`:
   - `canvas` → render + create; attach tab if `step.tab === true`
   - `list` → create list; if `step.bookmark === true` call `attachListToChannel` (not full tab probe path)
   - `workflow` → if `link === onboarding` provision shortcut (needs dashboard id from registry)
3. Remove `provisionListChrome` / separate chrome loop
4. Keep pinned index + finalize dashboard after steps loop
5. **GREEN:** integration test passes

**Commit:** `refactor(provisioner): steps loop with tab and bookmark flags`

---

## Task 3.1–3.2 — Pinned index from steps

**Files:** `message-renderer.ts`

1. **RED:** Navigation test expects order from steps, not `navigation.entries`
2. Build links from steps where `title` is set and id resolves in context
3. Infer `link_type` from `kind` (canvas → canvas URL, list → list URL)
4. **GREEN:** `navigation entries render pinned index links in order` equivalent test passes

**Commit:** `refactor(messages): derive pinned index from composition steps`

---

## Task 4.1–4.2 — Embed and cleanup

**Files:** `embed-content.ts`, `embedded-content.generated.ts`, `composition-resolver.ts`

1. Run embed script after manifest change
2. Delete validation paths for removed manifest planes
3. **GREEN:** full `deno task test`

**Commit:** `chore(content): embed simplified tes-event manifest`

---

## Task 5.x — Test matrix (spec scenario coverage)

| Scenario | Test file / name |
|----------|------------------|
| TES event manifest loads and validates | `composition_test.ts` |
| Kind-scoped surfacing flags validate | `composition_test.ts` (parse invalid fixtures) |
| Canvas tab opt-in | `composition_test.ts` provisioner mock |
| List bookmark opt-in | `lists_test.ts`, provisioner integration |
| Steps provision in order | `composition_test.ts` provisioner integration |
| Pinned index follows step order | `composition_test.ts` / `slack_content_test.ts` |
| Deliverables/Incidents bookmarks on seed | `composition_test.ts` provisioner integration |

---

## Task 6–7 — Docs and changelog

Update README, smoke checklist if needed; changelog entry via changelog-generator.

---

## Deferred manual dogfood

| Check | Automated equivalent |
|-------|---------------------|
| Manual smoke: bookmarks visible in channel header | `composition_test.ts` provisioner asserts `bookmarks.add` calls |

No `[~]` deferred rows — manual smoke optional post-deploy only.
