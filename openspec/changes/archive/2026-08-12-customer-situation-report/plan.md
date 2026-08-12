# Customer Situation Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a customer-facing Situation Report canvas with fixed template structure, customer status bucket mapping, channel seeding, and manual publish from the Deliverables List.

**Architecture:** Declarative Handlebars canvas template (`situation-report.hbs.md`) plus domain JSON for internal→customer status mapping. Channel composition adds `situation_report` slot. Publish module reads list rows, computes bucket metrics, rotates current content into changelog, and updates canvas via existing Slack canvas helpers.

**Tech Stack:** Deno Slack SDK, Handlebars, existing `lib/content/*` loaders, `packages/shared` types, Slack Lists + Canvas APIs.

## Global Constraints

- Slack-native state only — no external DB
- Internal Deliverable Status vocabulary unchanged on the list
- Agent write gate — publish MUST NOT modify Deliverables List rows
- Canvas metadata `<!-- tes-event-context -->` injected by renderer only
- Canonical test command: `cd slack-app && deno task test`

---

## Task 1: Customer status domain JSON

**Files:**
- Create: `slack-app/content/domain/customer-deliverable-statuses.json`
- Create: `slack-app/schemas/content/customer-deliverable-statuses.schema.json`
- Modify: `slack-app/lib/content/domain.ts`
- Modify: `slack-app/schemas/content/capabilities/domain-refs.v1.json`
- Test: `slack-app/tests/domain_content_test.ts`

- [ ] **Step 1:** Write failing test `customer-deliverable-statuses maps all DeliverableStatus values`
- [ ] **Step 2:** Run `cd slack-app && deno task test domain_content_test.ts` — expect FAIL
- [ ] **Step 3:** Add JSON with eight entries and bucket mapping per design.md
- [ ] **Step 4:** Add schema + loader accessor `getCustomerDeliverableStatusMap()` / `mapToCustomerStatus()`
- [ ] **Step 5:** Register `@domain/customer-deliverable-statuses` in capability catalog
- [ ] **Step 6:** Run tests — expect PASS
- [ ] **Step 7:** Commit

---

## Task 2: Situation Report canvas template

**Files:**
- Create: `slack-app/content/canvases/situation-report.hbs.md`
- Modify: `slack-app/lib/content/canvas-renderer.ts`
- Test: `slack-app/tests/situation_report_template_test.ts`

- [ ] **Step 1:** Write failing test — template includes Executive summary, Current situation, Changelog, Generated date
- [ ] **Step 2:** Run test — expect FAIL
- [ ] **Step 3:** Author template with Handlebars placeholders per design (empty-state for first seed)
- [ ] **Step 4:** Add `renderSituationReportSeedCanvas(context)` exporting initial markdown
- [ ] **Step 5:** Run `cd slack-app && deno task test situation_report_template_test.ts` — PASS
- [ ] **Step 6:** Commit

---

## Task 3: Channel composition slot

**Files:**
- Modify: `slack-app/content/channels/tes-event.json`
- Modify: `packages/shared/src/types/index.ts` (or index export path)
- Modify: `slack-app/lib/event-context.ts` if slot serialization needed
- Test: `slack-app/tests/provision_test.ts`, `slack-app/tests/composition_test.ts`

- [ ] **Step 1:** Write failing test — `tes-event.json` has `situation_report` slot and nav entry
- [ ] **Step 2:** Add resource + `context_slot_map.situation_report` → `situationReportCanvasId`
- [ ] **Step 3:** Add `situationReportCanvasId: string` to `TesEventContext`
- [ ] **Step 4:** Wire provisioner to seed situation report canvas using renderer from Task 2
- [ ] **Step 5:** Run provision/composition tests — PASS
- [ ] **Step 6:** Commit

---

## Task 4: Publish module

**Files:**
- Create: `slack-app/lib/situation-report.ts`
- Test: `slack-app/tests/situation_report_publish_test.ts`

- [ ] **Step 1:** Write failing test `first publish sets Generated date and customer fields`
- [ ] **Step 2:** Write failing test `second publish appends changelog row`
- [ ] **Step 3:** Write failing test `Blocked maps to Needs your input; Assignee excluded`
- [ ] **Step 4:** Implement `buildSituationReportFromList(rows, context, previousCanvas?)` — pure function for testability
- [ ] **Step 5:** Implement changelog rotation (parse prior Generated date + compress current → table row)
- [ ] **Step 6:** Include delivery excerpt placeholder per item
- [ ] **Step 7:** Run publish tests — PASS
- [ ] **Step 8:** Commit

---

## Task 5: Publish trigger (Slack function)

**Files:**
- Create: `slack-app/functions/publish_situation_report/mod.ts` (or workflow)
- Modify: `slack-app/content/messages/pinned-index.hbs.json` (publish button)
- Modify: `slack-app/manifest.ts`

- [ ] **Step 1:** Write handler test with mocked list + canvas clients
- [ ] **Step 2:** Implement function — load context, fetch list items, call publish module, update canvas
- [ ] **Step 3:** Gate on `onboardingComplete`; surface error if canvas ID missing
- [ ] **Step 4:** Add pinned-index button "Publish situation report"
- [ ] **Step 5:** Run full `cd slack-app && deno task test` — PASS
- [ ] **Step 6:** Commit

---

## Task 6: Documentation and changelog

- [ ] **Step 1:** Update `slack-app/content/README.md` with Situation Report section
- [ ] **Step 2:** Update `CHANGELOG.md` via changelog-generator skill
- [ ] **Step 3:** Commit

---

## Verification checklist (apply phase)

```bash
cd slack-app && deno task test
openspec validate --all --json
```

All delta spec scenarios in `openspec/changes/customer-situation-report/specs/` MUST have corresponding automated tests before verify PASS.
