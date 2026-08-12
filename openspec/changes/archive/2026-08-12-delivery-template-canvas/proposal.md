## Why

Delivery Template Canvases today are created on Accept with a minimal stub that does not capture artefacts, visual proof, configuration, business value, or SailPoint component coverage. The Situation Report cannot populate its Delivery excerpt because no canonical section structure or agent contract exists. TES needs a standard per-deliverable canvas that humans and a delivery agent co-maintain, with a clear review gate before customer-facing content flows into the Situation Report.

## What Changes

**Canvas creation timing**
- From: Delivery Template Canvas created on Accept, linked immediately in Deliverables List
- To: Canvas created when list status first reaches **Validation required**; Deliverable link empty until then
- Reason: Canvas represents validated delivery documentation, not proposal acceptance
- Impact: **Breaking** for Accept flow and smoke-test expectations

**Delivery canvas template**
- From: Stub sections (Category, Requirements, Source Reference, Requirements Canvas Excerpt, Status) built in code
- To: Declarative `content/canvases/delivery.hbs.md` with fixed customer/internal sections, metadata block (Author, Draft version, review flag, actions)
- Reason: Consistent structure for humans, agent, and Situation Report excerpt extraction
- Impact: Non-breaking for channels without Validation-required deliverables

**Delivery agent consolidation**
- From: No delivery agent; no auto-draft on status change
- To: agent-service delivery agent reads list row + canvas + suite components; auto-runs on Validation required; manual re-run via canvas Consolidate action
- Reason: Agent drafts and refines narrative sections; humans own proof and artefacts
- Impact: New HTTP endpoint and slack-app orchestration

**Situation Report delivery excerpt**
- From: Placeholder `_Pending delivery canvas structure_` for all items
- To: Extract `## Customer summary` (500 char soft cap, optional hero proof link); fallback when canvas missing or review pending
- Reason: Customer-facing digest without exposing internal config
- Impact: Modifies publish module behaviour

**Review gate on canvas**
- From: No review semantics on delivery canvas
- To: Agent-run sets canvas banner + section markers; human clears via Mark reviewed action
- Reason: Prevent unreviewed agent content reaching customers via Situation Report

## Capabilities

### New Capabilities

- `delivery-agent`: LangGraph delivery agent, consolidation endpoint, per-section output contract, draft version increment

### Modified Capabilities

- `deliverables`: Deferred canvas creation; Validation-required trigger; review flag semantics; Situation Report excerpt from Customer summary
- `slack-ui-content`: `delivery.hbs.md` template, renderer accessor, canvas action triggers
- `ubiquitous-language`: Delivery draft, consolidation, draft version, customer summary, review flag terms

## Impact

- **New:** `content/canvases/delivery.hbs.md`, delivery agent in agent-service, status-change handler, canvas action handlers (Consolidate, Mark reviewed), excerpt extractor in `situation-report.ts`
- **Modified:** `accept_proposals/mod.ts`, `deliverables.ts`, `situation-report.ts`, `deliverables/spec.md`, smoke-test checklist
- **Removed behaviour:** On-Accept canvas creation via `buildDeliveryTemplateContent` stub
- **Tests:** Template validation, status-trigger canvas creation, agent consolidation output, excerpt extraction rules, review flag clearance
- **Deferred:** Category-specific template extensions; automated Situation Report publish on canvas update
