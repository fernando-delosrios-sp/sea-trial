# Delivery Template Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define and implement the Delivery Template Canvas structure, delivery agent consolidation workflow, Validation-required canvas creation, and Situation Report Customer summary excerpt extraction.

**Architecture:** Declarative Handlebars template (`delivery.hbs.md`) plus delivery agent in agent-service. slack-app orchestrates status-change and canvas-action triggers, applies agent output, manages review flags. Situation Report publish reads `## Customer summary` from linked canvas with review-aware fallbacks.

**Tech Stack:** Deno Slack SDK, Handlebars, LangGraph.js (agent-service), existing `lib/content/*` loaders, `packages/shared` types, Slack Lists + Canvas APIs.

## Global Constraints

- Slack-native state only — no external DB
- Agent write gate — delivery agent MUST NOT write to Deliverables List
- Secrets on Infrastructure canvas only — never in delivery Configuration
- Canvas metadata `<!-- tes-event-context -->` injected by renderer only
- Canonical test commands: `cd slack-app && deno task test`; `cd agent-service && npm test`

---

## Task 1: Delivery canvas template

**Files:**
- Create: `slack-app/content/canvases/delivery.hbs.md`
- Modify: `slack-app/lib/content/canvas-renderer.ts`
- Test: `slack-app/tests/delivery_canvas_template_test.ts`

- [ ] **Step 1:** Write failing test — template includes all required H2 sections and Customer summary heading
- [ ] **Step 2:** Run `cd slack-app && deno task test delivery_canvas_template_test.ts` — expect FAIL
- [ ] **Step 3:** Author `delivery.hbs.md` per design.md D1 with metadata block placeholders
- [ ] **Step 4:** Add `renderDeliveryCanvas(viewModel)` exporting initial/consolidated markdown
- [ ] **Step 5:** Run tests — PASS
- [ ] **Step 6:** Commit

---

## Task 2: Remove on-Accept canvas creation

**Files:**
- Modify: `slack-app/functions/accept_proposals/mod.ts`
- Modify: `slack-app/lib/review-gate.ts`, `slack-app/lib/deliverables.ts`
- Test: `slack-app/tests/deliverables_test.ts`

- [ ] **Step 1:** Write failing test — Accept creates row with empty Deliverable field
- [ ] **Step 2:** Remove canvas creation from accept path; stop calling `buildDeliveryTemplateContent` on accept
- [ ] **Step 3:** Update `processAcceptProposals` return type if deliveryContents no longer needed on accept
- [ ] **Step 4:** Run deliverables tests — PASS
- [ ] **Step 5:** Commit

---

## Task 3: Validation required status trigger

**Files:**
- Create: `slack-app/lib/delivery-canvas.ts` (orchestration helpers)
- Create: `slack-app/functions/on_deliverable_status_change/mod.ts` (or list field_change handler)
- Modify: `slack-app/content/lists/deliverables.json` — wire `behavior.field_change` for status
- Test: `slack-app/tests/validation_required_canvas_test.ts`

- [ ] **Step 1:** Write failing test — status → Validation required creates canvas and links row
- [ ] **Step 2:** Implement handler — detect first transition, create canvas, set Deliverable link
- [ ] **Step 3:** Invoke delivery agent (stub/mock initially) for draft v1
- [ ] **Step 4:** Run tests — PASS
- [ ] **Step 5:** Commit

---

## Task 4: Delivery agent (agent-service)

**Files:**
- Create: `agent-service/src/agents/delivery/graph.ts`, `consolidate.ts`
- Modify: `agent-service/src/server.ts` — add route
- Create: `packages/shared` consolidation types
- Test: `agent-service/tests/delivery-agent.test.ts`

- [ ] **Step 1:** Write failing tests for section output contract (gap callouts, Author preservation, no secrets)
- [ ] **Step 2:** Implement delivery agent graph with section prompts per design D8
- [ ] **Step 3:** Add POST `/agents/delivery/consolidate` endpoint
- [ ] **Step 4:** Run agent-service tests — PASS
- [ ] **Step 5:** Commit

---

## Task 5: Canvas actions — Consolidate and Mark reviewed

**Files:**
- Create: `slack-app/functions/consolidate_delivery/mod.ts`
- Create: `slack-app/functions/mark_delivery_reviewed/mod.ts`
- Modify: `slack-app/manifest.ts`
- Test: `slack-app/tests/delivery_review_flag_test.ts`

- [ ] **Step 1:** Write failing tests — review flag set after consolidate; cleared after mark reviewed; reappears on re-consolidate
- [ ] **Step 2:** Implement Consolidate — load row + canvas, POST agent, apply output, increment draft version, set flag
- [ ] **Step 3:** Implement Mark reviewed — strip banner and section markers
- [ ] **Step 4:** Wire action links in delivery canvas metadata (workflow URLs or canvas-compatible mechanism)
- [ ] **Step 5:** Run tests — PASS
- [ ] **Step 6:** Commit

---

## Task 6: Situation Report excerpt extraction

**Files:**
- Modify: `slack-app/lib/situation-report.ts`
- Test: `slack-app/tests/situation_report_publish_test.ts`

- [ ] **Step 1:** Write failing test — excerpt from Customer summary when reviewed
- [ ] **Step 2:** Write failing test — fallback when review pending or canvas missing
- [ ] **Step 3:** Implement `extractDeliveryExcerpt()` with 500 char cap and hero proof link
- [ ] **Step 4:** Replace `DELIVERY_EXCERPT_PLACEHOLDER` usage in publish path
- [ ] **Step 5:** Run situation report tests — PASS
- [ ] **Step 6:** Commit

---

## Task 7: Documentation and changelog

- [ ] **Step 1:** Update `slack-app/content/README.md` with Delivery Template Canvas section
- [ ] **Step 2:** Update `docs/smoke-test-checklist.md`
- [ ] **Step 3:** Update CHANGELOG via changelog-generator skill
- [ ] **Step 4:** Commit

---

## Verification checklist (apply phase)

```bash
cd slack-app && deno task test
cd agent-service && npm test
openspec validate --all --json
```

All delta spec scenarios in `openspec/changes/delivery-template-canvas/specs/` MUST have corresponding automated tests before verify PASS.
