# Brainstorm — TES Slack Process MVP

Raw capture of the design exploration session (2026-08-04).

## Background

Technical Evaluation Services (TES) supports Sales Engineers on TES events (PoCs, PoVs, custom demos, complex integrations). The team wants to streamline delivery in Slack. Main actors: TES team, Sales Engineers (SE), Account Executives (AE).

Vision: a Slack app that builds channel structure and contents — dashboard canvas, deliverables list, incidents list, infrastructure canvas, files/links, workflows where useful. Slack Workflows alone are insufficient; a custom app is required. Starting point: an AI agent that helps SEs process documents and update deliverables with correct format; more agents later.

Preferred stack: TypeScript, LangGraph.js, Slack native capabilities where possible.

Project state at start: greenfield repo (`tes-event-process`) with OpenSpec scaffolding only.

## Decision Chain

### Q1: Agent input/output

**Answer:** SEs bring raw documents in different formats — some well-structured with explicit deliverables, some vague. Before processing, AE/SE MUST have provided the proposed SailPoint solution stack scope (foundation of delivery). Deliverables are shaped from scope + requirements. Well-structured deliverables found in docs MUST be respected 1:1 — never merged. Similar use cases get analysis notes. Agent MUST ask for clarification freely.

### Q2: Solution stack capture

**Answer:** Onboarding form for AE/SE with all necessary info.

### Q3: Onboarding form fields

**Answer:** Customer name, Main prospect goal, Deal history, Project type, Stakeholders, Competitors, SailPoint suite (derives technical components), Deadline, Notes. Extensible later.

### Q4: Post-form flow

**Answer:** Onboarding happens *inside* the channel as the first step — not what triggers channel creation. Updates dashboard; other channel aspects may be decided here.

### Q5: Channel creation trigger

**Answer:** Decision happens in an opportunity channel. TES team triggers creation with context via integration. **MVP:** manual shortcut with minimal pasted context (no Salesforce).

### Q6: Channel structure

**Answer:** Dashboard canvas, Deliverables list, Incidents list, Infrastructure canvas, Files/link section, Workflows if useful.

### Q7: Deliverables list schema

**Answer:** Task ID, Assignee, Status, Situation, Category, Requirements, Due date, Deliverable (canvas link — one canvas per record, created on demand). Users may extend schema; these are mandatory core fields.

### Q8: Delivery template canvas

**Answer:** Needs help defining initial structure. Plan for core structure with optional subsections per category. Deferred detailed sections to design phase.

### Q9: Incidents

**Answer:** Cross-team support tickets for visibility. Fields: ID, Description, Link, Assignee, Due date, Situation.

### Q10: Agent invocation UX

**Answer:** No strong preference — recommend best fit in design.

### Q11: Review before list write

**Answer:** Review first. Only update list on explicit user acceptance. Agent MUST read and modify existing list items (via same review gate).

### Q12: Environment

**Answer:** Slack Enterprise Grid with Salesforce ecosystem; start on Slack dev tenant for MVP.

### Q13: Document formats

**Answer:** Whatever Slack accepts; agent detects format and rejects gracefully when unsupported.

### Q14: Channel naming (user refinement)

**Answer:** `#proj-{custom-name-decided-at-creation}-tes`

### Q15: Deliverable statuses (user refinement)

**Answer:** Not started, Not needed, Not doable, In progress, Blocked, Validation required, Accepted, Needs clarification

### Q16: Hosting preference (user refinement)

**Answer:** Slack native as much as possible.

### Q17: Requirements Canvas (user refinement)

**Answer:** Add a Requirements Canvas reflecting results of requirements collection — intermediate memory between sessions, for refinement/extension, immediate source of truth when building deliverable items.

### Q18: Agent architecture clarification

**Answer:** One app, multiple internal agents possible. User confirmed: embedded LangGraph agents within the app, not generic Slack workspace AI. Slack Agent/Assistant API for native UX; app manages Slack integration.

### Q19: TypeScript

**Answer:** User requested TypeScript in tech stack.

## Approaches Considered

### A) Slack-native first + LangChain agent service — **CHOSEN**

Single Slack app owns lifecycle. LangGraph agent for document processing. Slack objects as source of truth. Workflows only for simple notifications.

### B) Workflows-heavy + thin agent sidecar — REJECTED

Workflows cannot do dynamic canvas-per-row, conversational agent, or list CRUD well. Two systems to maintain.

### C) External DB + Slack as UI — REJECTED

Duplicated state, sync complexity, conflicts with Slack-as-source-of-truth intent.

## Agreed Design Summary

- **Process:** Opportunity channel → TES manual trigger → channel provisioned → AE/SE onboarding inside channel → agent processes docs → Requirements Canvas updated → proposals in thread → review gate → Deliverables List + on-demand Delivery Template Canvas.
- **Actors:** TES (trigger, review), AE/SE (onboarding, upload, accept), Agent (process, clarify, propose).
- **Hard gates:** Onboarding complete before agent; explicit accept before list write.
- **Agent rules:** Scope-first, no-merge, similarity notes, clarification loops, read/modify existing items via review.
- **Requirements Canvas sections:** Scope, Documents processed, Extracted requirements, Deliverable candidates, Analysis notes, Open questions, Session log.
- **Hosting:** Deno Slack SDK on Slack-managed infra for app shell; minimal external Node service for LangGraph agent; Slack-native data only (no DB).
- **MVP out of scope:** Salesforce integration, incidents automation, infrastructure agent, OCR, Assistant side panel (channel @mention primary).

## Open Items Deferred

- Situation and Category enum values (TBD in implementation)
- Detailed Delivery Template Canvas subsection catalog per category
- Exact SailPoint suite → components mapping data
