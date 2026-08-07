# Domain Content JSON — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Extract SailPoint suite mappings and deliverable status vocabulary to versioned JSON with a validated loader and shared-type sync tests.

**Architecture:** JSON files under `content/domain/`; `lib/content/domain.ts` loads and validates via JSON Schema; `suite-components.ts` becomes thin re-export. Sync tests enforce parity with `DeliverableStatus` union.

**Tech Stack:** Deno, JSON Schema (manual validation or std), existing monorepo test harness

**Canonical test commands:**
- Monorepo: `npm test` (from repo root)
- Slack-app: `cd slack-app && deno task test`

---

## Task 1: Domain JSON content files

**Files:** `slack-app/content/domain/sailpoint-suites.json`, `slack-app/content/domain/deliverable-statuses.json`, `slack-app/schemas/domain/*.schema.json`

- [ ] **Step 1:** Create `sailpoint-suites.json` from current `SUITE_COMPONENTS` in `suite-components.ts`
- [ ] **Step 2:** Create `deliverable-statuses.json` with all 8 `DeliverableStatus` values
- [ ] **Step 3:** Add JSON Schema files describing both formats
- [ ] **Step 4:** Commit content + schemas

---

## Task 2: Domain loader (TDD)

**Files:** `slack-app/lib/content/domain.ts`, `slack-app/tests/domain_content_test.ts`

- [ ] **Step 1:** Write failing tests — load suites, load statuses, validate schema, sync with DeliverableStatus
- [ ] **Step 2:** Run `cd slack-app && deno task test` — expect FAIL
- [ ] **Step 3:** Implement loader with validation
- [ ] **Step 4:** Run tests — expect PASS

---

## Task 3: Refactor suite-components re-exports

**Files:** `slack-app/lib/suite-components.ts`, existing `suite_components_test.ts`

- [ ] **Step 1:** Replace inline data with re-exports from domain loader
- [ ] **Step 2:** Run existing suite_components_test — expect PASS
- [ ] **Step 3:** Add test that modal options match domain JSON keys

---

## Task 4: Deliverable status accessor

**Files:** `slack-app/lib/content/domain.ts`, `slack-app/tests/domain_content_test.ts`

- [ ] **Step 1:** Write test — `getDeliverableStatusChoices()` returns all DeliverableStatus values
- [ ] **Step 2:** Implement accessor (used by future declarative-slack-content; expose now for sync test coverage)
- [ ] **Step 3:** Run tests — expect PASS

---

## Task 5: Documentation and changelog

**Files:** `README.md`, changelog

- [ ] **Step 1:** Document domain content directory in README
- [ ] **Step 2:** Add changelog entry
- [ ] **Step 3:** Run `npm test` — full suite green

---

## Global Constraints

- Non-breaking: existing `deriveComponents` / `getSupportedSuites` import paths preserved
- No agent-service changes
- JSON is canonical for slack-app; sync tests enforce shared type parity
- All `#### Scenario:` items in delta specs MUST have passing automated tests
