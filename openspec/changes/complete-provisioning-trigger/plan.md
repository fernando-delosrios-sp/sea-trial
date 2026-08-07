# Complete Provisioning Trigger — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Wire the "Create TES Event" global shortcut to a creation modal that provisions a fully seeded TES Event Channel with Account, Salesforce URL, members, and dashboard Project section; add pinned onboarding button with Account pre-fill.

**Architecture:** Deno Slack SDK slack-app only; extend `packages/shared` types; reuse existing provision + seed workflow steps; no agent-service changes.

**Tech Stack:** TypeScript, Deno Slack SDK, Slack modals (multi_users_select), Block Kit buttons

**Canonical test commands:**
- `cd slack-app && deno task test`
- `openspec validate complete-provisioning-trigger --json`

---

## Task 1: Shared types (TDD)

**Files:** `packages/shared/src/types/index.ts`, `slack-app/tests/event_context_test.ts`

**Spec scenarios:** event-channel — Metadata round-trip; ubiquitous-language — Account

- [ ] **Step 1:** Write failing test — deserialize context with `accountName`, `salesforceOpportunityUrl`, `memberUserIds`, `contextNotes`
- [ ] **Step 2:** Add fields to `TesEventContext`; rename `customerName` → `accountName` in `OnboardingForm`
- [ ] **Step 3:** Fix compile errors in slack-app imports
- [ ] **Step 4:** Run `cd slack-app && deno task test` — green
- [ ] **Step 5:** Commit `feat(shared): extend TesEventContext for creation modal`

---

## Task 2: Creation modal function

**Files:** `slack-app/functions/open_create_tes_event/mod.ts`, `slack-app/manifest.ts`

**Spec scenarios:** event-channel — Open creation modal, Submit valid creation form

- [ ] **Step 1:** Write failing test for modal view structure (field block IDs present)
- [ ] **Step 2:** Implement `open_create_tes_event` SlackFunction with modal blocks
- [ ] **Step 3:** Register function in manifest
- [ ] **Step 4:** Run tests — green
- [ ] **Step 5:** Commit `feat(slack-app): add creation modal function`

---

## Task 3: Creation submit + workflow wiring

**Files:** `slack-app/functions/submit_create_tes_event/mod.ts` (or view handler), `slack-app/workflows/create_tes_event.ts`, `slack-app/triggers/create_tes_event.ts`

**Spec scenarios:** event-channel — Successful channel creation, Reject invalid project name

- [ ] **Step 1:** Write failing test for channel slug validation on submitted project name
- [ ] **Step 2:** Implement view submission parsing → workflow inputs
- [ ] **Step 3:** Update trigger: shortcut → open modal function (not direct workflow with empty IDs)
- [ ] **Step 4:** Update workflow input parameters to match new fields
- [ ] **Step 5:** Run tests — green
- [ ] **Step 6:** Commit `feat(slack-app): wire creation modal to provision workflow`

---

## Task 4: Provision members

**Files:** `slack-app/functions/provision_channel/mod.ts`, `slack-app/tests/provision_test.ts`

**Spec scenarios:** event-channel — Successful channel creation (member invite)

- [ ] **Step 1:** Write failing test — member_user_ids passed to invite call
- [ ] **Step 2:** Replace ae_user_id/se_user_id with member_user_ids array; dedupe trigger user
- [ ] **Step 3:** Run tests — green
- [ ] **Step 4:** Commit `feat(slack-app): invite multi-select members on provision`

---

## Task 5: Dashboard Project section + pinned button

**Files:** `slack-app/templates/index.ts`, `slack-app/functions/seed_channel_objects/mod.ts`, `slack-app/tests/` (template or seed test)

**Spec scenarios:** event-channel — Project section populated at seed; Objects seeded on creation

- [ ] **Step 1:** Write failing test — dashboard contains Account and SF URL when context set
- [ ] **Step 2:** Update `dashboardTemplate` Project section
- [ ] **Step 3:** Update seed to populate creation fields in context before dashboard write
- [ ] **Step 4:** Add Block Kit pinned index with Complete onboarding button
- [ ] **Step 5:** Run tests — green
- [ ] **Step 6:** Commit `feat(slack-app): dashboard project section and onboarding button`

---

## Task 6: Onboarding Account pre-fill + button handler

**Files:** `slack-app/functions/open_onboarding/mod.ts`, `slack-app/functions/submit_onboarding/mod.ts`, block_actions wiring

**Spec scenarios:** onboarding — Open onboarding form (pre-fill), Submit onboarding (account overwrite)

- [ ] **Step 1:** Write failing test — open_onboarding receives accountName in initial value
- [ ] **Step 2:** Pre-fill Account field; rename labels to Account
- [ ] **Step 3:** Wire Complete onboarding button → open_onboarding
- [ ] **Step 4:** Submit writes accountName from form to context
- [ ] **Step 5:** Update summon-only copy in pinned index and gate messages
- [ ] **Step 6:** Run tests — green
- [ ] **Step 7:** Commit `feat(slack-app): onboarding button and account pre-fill`

---

## Task 7: Deploy and manual verify

**Files:** `docs/smoke-test-checklist.md`

- [ ] **Step 1:** Run full `deno task test` and `openspec validate complete-provisioning-trigger --json`
- [ ] **Step 2:** Deploy slack-app; create/update shortcut trigger in workspace
- [ ] **Step 3:** Execute smoke checklist provisioning + onboarding steps
- [ ] **Step 4:** Commit docs/changelog updates

---

## Task mapping to tasks.md

| tasks.md | Plan task |
|----------|-----------|
| 1.x | Task 1 |
| 2.x | Tasks 2–3 |
| 3.x | Tasks 4–5 |
| 4.x | Task 6 |
| 5.x | Task 6 (copy) |
| 6.x | Task 7 |
| 7.x, 8.x | Task 7 + changelog |
