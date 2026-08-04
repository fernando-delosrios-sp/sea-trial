# TES Slack Process MVP Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a Slack-native TES event delivery platform with channel provisioning, onboarding, Requirements Agent, Requirements Canvas, and review-gated Deliverables List.

**Architecture:** Deno Slack SDK app on Slack-managed infrastructure is the Slack adapter (I/O only); Node.js TypeScript LangGraph.js agent-service owns all reasoning; `packages/shared` holds canonical types for the HTTP contract; all state in Slack canvases and lists. All-in-Slack agent (Option B) was rejected — external agent-service is required for agent flexibility.

**Tech Stack:** TypeScript throughout, Deno Slack SDK, LangGraph.js, Slack Canvas/List APIs, Node.js 20+

## Global Constraints

- Slack-native state only — no external DB
- Channel naming: `#proj-{custom-name}-tes`
- Deliverable statuses (exact): Not started, Not needed, Not doable, In progress, Blocked, Validation required, Accepted, Needs clarification
- Agent gate: onboarding complete before processing
- Write gate: explicit Accept before Deliverables List updates
- No-merge rule: preserve explicit deliverables 1:1

**Canonical test commands:**
- `cd slack-app && deno task test`
- `cd agent-service && npm test`
- `openspec validate --all --json`

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`, `slack-app/manifest.ts`, `agent-service/package.json`, `packages/shared/src/types/index.ts`, `.env.example`, `README.md`

- [ ] **Step 1:** Create npm workspace root with `slack-app`, `agent-service`, `packages/shared`
- [ ] **Step 2:** Add shared types (`DeliverableStatus`, `OnboardingForm`, `TesEventContext`, `DeliverableProposal`)
- [ ] **Step 3:** Run `slack create` or scaffold Deno Slack SDK app in `slack-app/`
- [ ] **Step 4:** Init agent-service with LangGraph.js, express/hono server
- [ ] **Step 5:** Verify `deno task test` and `npm test` pass (empty)
- [ ] **Step 6:** Commit `chore: scaffold tes-event-process monorepo`

---

## Task 2: Channel provisioning

**Files:**
- Create: `slack-app/triggers/create_tes_event.ts`, `slack-app/workflows/create_tes_event.ts`, `slack-app/functions/provision_channel/`, `slack-app/lib/channel.ts`

**Spec scenarios:** event-channel — Successful channel creation, Invalid project name

- [ ] **Step 1:** Write failing test for channel slug from project name
- [ ] **Step 2:** Implement shortcut + modal collecting `projectName`, AE/SE user IDs, optional context
- [ ] **Step 3:** Implement `createChannel` with name `#proj-{slug}-tes`
- [ ] **Step 4:** Manual test in dev tenant
- [ ] **Step 5:** Commit `feat: add TES event channel provisioning`

---

## Task 3: Seed channel objects

**Files:**
- Create: `slack-app/functions/seed_channel_objects/`, `slack-app/lib/canvas.ts`, `slack-app/lib/lists.ts`, `slack-app/templates/*.ts`

**Spec scenarios:** event-channel — Objects seeded, Metadata round-trip, Create/Update canvas

- [ ] **Step 1:** Write failing test for `TesEventContext` metadata serialize/deserialize
- [ ] **Step 2:** Implement canvas creation for Dashboard, Requirements, Infrastructure
- [ ] **Step 3:** Implement Deliverables and Incidents list creation with core columns
- [ ] **Step 4:** Post pinned index with links and onboarding CTA
- [ ] **Step 5:** Commit `feat: seed canvases and lists on channel creation`

---

## Task 4: Onboarding

**Files:**
- Create: `slack-app/functions/open_onboarding/`, `slack-app/functions/submit_onboarding/`, `slack-app/lib/suite-components.ts`

**Spec scenarios:** onboarding — all four scenarios

- [ ] **Step 1:** Write failing test for `deriveComponents("Identity Security Cloud")`
- [ ] **Step 2:** Implement onboarding modal with all fields
- [ ] **Step 3:** Implement submit updating Dashboard + `onboardingComplete: true`
- [ ] **Step 4:** Implement agent gate in mention handler stub
- [ ] **Step 5:** Commit `feat: add AE/SE onboarding form`

---

## Task 5: Document parsers

**Files:**
- Create: `agent-service/src/parsers/index.ts`, `pdf.ts`, `docx.ts`, `xlsx.ts`, `text.ts`, `agent-service/tests/parsers.test.ts`

**Note:** Parser libraries and whether slack-app sends raw bytes vs pre-processed content are deferred — implement per design open questions; behavior must match spec scenarios below.

**Spec scenarios:** requirements-agent — Supported format, Unsupported format

- [ ] **Step 1:** Write failing tests with fixture files
- [ ] **Step 2:** Implement `parseDocument` with format detection
- [ ] **Step 3:** Run `npm test` — all pass
- [ ] **Step 4:** Commit `feat: add document parser pipeline`

---

## Task 6: Requirements Agent

**Files:**
- Create: `agent-service/src/agents/requirements/graph.ts`, `prompts.ts`, `state.ts`, `server.ts`

**Spec scenarios:** requirements-agent — Process endpoint, No-merge, Out-of-scope, Clarification

- [ ] **Step 1:** Write failing test for no-merge with two explicit deliverables in input
- [ ] **Step 2:** Implement LangGraph graph nodes
- [ ] **Step 3:** Implement POST `/agents/requirements/process`
- [ ] **Step 4:** Commit `feat: add Requirements Agent with LangGraph`

---

## Task 7: Slack agent invocation

**Files:**
- Create: `slack-app/functions/invoke_agent/`, `slack-app/lib/agent-client.ts`, `slack-app/lib/event-context.ts`

**Spec scenarios:** requirements-agent — Successful agent run, Multi-turn, Second session extends canvas

- [ ] **Step 1:** Write failing test for gate block when onboarding incomplete
- [ ] **Step 2:** Implement @mention handler: load context, download files, call agent-service
- [ ] **Step 3:** Update Requirements Canvas; post Block Kit proposals
- [ ] **Step 4:** Implement thread reply re-invocation
- [ ] **Step 5:** Commit `feat: wire Requirements Agent to Slack mentions`

---

## Task 8: Review gate and deliverables

**Files:**
- Create: `slack-app/functions/accept_proposals/`, `slack-app/lib/deliverables.ts`

**Spec scenarios:** deliverables — all six scenarios

- [ ] **Step 1:** Write failing test: accept creates row, reject does not
- [ ] **Step 2:** Implement Accept/Edit/Reject Block Kit actions
- [ ] **Step 3:** Implement list row creation with core schema
- [ ] **Step 4:** Mark promoted candidates in Requirements Canvas
- [ ] **Step 5:** Commit `feat: add review gate and deliverables list writes`

---

## Task 9: Delivery template canvas

**Files:**
- Create: `slack-app/templates/delivery.ts`, modify accept handler

**Spec scenarios:** deliverables — Canvas created on accept, No canvas for empty rows

- [ ] **Step 1:** Implement `createDeliveryCanvas` pre-filled from Requirements canvas + proposal
- [ ] **Step 2:** Link canvas URL in Deliverables list Deliverable field on accept
- [ ] **Step 3:** Test on-demand only — no canvas without accept
- [ ] **Step 4:** Commit `feat: on-demand delivery template canvas creation`

---

## Task 10: Tests and smoke test

**Files:**
- Create: `agent-service/tests/agent-rules.test.ts`, `docs/smoke-test-checklist.md`

- [ ] **Step 1:** Add automated tests for no-merge, scope, and clarification rules
- [ ] **Step 2:** Run full smoke test in dev tenant
- [ ] **Step 3:** Run `openspec validate --all --json`
- [ ] **Step 4:** Commit `test: add agent rule tests and smoke test checklist`

---

## Task 11: Documentation and changelog

- [ ] **Step 1:** Update README with setup and install steps
- [ ] **Step 2:** Document agent-service API
- [ ] **Step 3:** Create changelog entry
- [ ] **Step 4:** Mark all tasks.md checkboxes complete
