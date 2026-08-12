# Content Capability Catalog Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** Single capability catalog for full Slack surface validation (modals, lists, messages) plus canvas rules; IDE JSON Schema + compiler enforcement.

**Architecture:** JSON catalogs under `slack-app/schemas/content/capabilities/` loaded by `capability-catalog.ts` and validated by `capability-validator.ts`. Compilers call validator at load; domain refs resolved via registry. List options use Slack-native `options.choices` shape.

**Tech Stack:** Deno, TypeScript, JSON Schema draft 2020-12

**Canonical test command:** `cd slack-app && deno task test`

---

## Task 1: Capability catalog files (tasks 1.1–1.6)

- [ ] **Step 1:** Create `capabilities/modal.v1.json` with all 18 input element types
- [ ] **Step 2:** Create `capabilities/list.v1.json` with all 20 column types
- [ ] **Step 3:** Create `capabilities/message.v1.json` with all Block Kit block types
- [ ] **Step 4:** Create `capabilities/canvas.v1.json`, `extensions.v1.json`, `domain-refs.v1.json`
- [ ] **Step 5:** Commit point — catalog files present

## Task 2: Loader + validator (tasks 2.1, 1.7, 2.2–2.4)

- [ ] **Step 1:** Write failing tests in `tests/capability_catalog_test.ts`
- [ ] **Step 2:** Implement `lib/content/capability-catalog.ts` and `capability-validator.ts`
- [ ] **Step 3:** Run `deno task test` — parity and rejection tests pass

## Task 3: Compiler integration (tasks 3.1–3.9, 4.1–4.2)

- [ ] **Step 1:** Wire modal/list compilers through validator; domain ref registry
- [ ] **Step 2:** Migrate `incidents.json`; update `getSlackListSchema` with options
- [ ] **Step 3:** Wire message + canvas validation
- [ ] **Step 4:** Run `deno task test`

## Task 4: JSON Schema + docs (tasks 2.5–2.6, 7.x, 8.x)

- [ ] **Step 1:** Update `schemas/content/modal.schema.json` and `list.schema.json` with type enums
- [ ] **Step 2:** Add `slack-app/content/README.md` author guide
- [ ] **Step 3:** Update CHANGELOG.md

**tracks:** tasks.md
