## Context

TES (Technical Evaluation Services) supports Sales Engineers on proofs of concept, proofs of value, custom demos, and complex integrations. The project is greenfield — no application code exists yet. OpenSpec specs and ubiquitous language are pre-defined.

Stakeholders: TES team (provisioning, review), Sales Engineers (document upload, acceptance), Account Executives (onboarding). Decision to use TES events is made in an opportunity channel; MVP uses a manual TES trigger with pasted context.

Constraints: Slack Enterprise Grid production target; Slack Pro workspace for MVP (confirmed 2026-08-04). Slack-native state only — no external database. TypeScript throughout both `slack-app/` (Deno) and `agent-service/` (Node.js).

## Goals / Non-Goals

**Goals:**

- Provision TES Event Channels with all required Slack objects from a TES global shortcut
- Collect AE/SE onboarding inside the channel; derive SailPoint components from suite selection
- Run a Requirements Agent that processes raw documents into a Requirements Canvas and proposed deliverables
- Enforce review-before-write to Deliverables List and on-demand Delivery Template Canvas creation
- Automated tests for no-merge, scope, and clarification rules

**Non-Goals:**

- Salesforce / opportunity channel auto-integration (phase 2)
- Incidents list automation
- Infrastructure Agent
- OCR for scanned documents
- Assistant side panel entry point (MVP uses channel @mention)
- External database or analytics dashboard
- Slack Workflow Builder as core engine
- All-in-Slack agent (LLM reasoning inside Deno Slack Functions — constrains multi-step agents and future agent expansion)
- LangSmith tracing and evals (deferred — not required for MVP)

## Decisions

### D1: Single app with embedded LangGraph agents

- **Choice:** One Slack app; Requirements Agent as first internal LangGraph graph; router for future agents
- **Reason:** Shared context loader, review gate, and Slack tools; one install for users
- **Considered alternatives:** Independent Slack AI (no custom logic); separate bot per agent (fragmented UX)

### D2: Deno Slack SDK on Slack-managed infrastructure

- **Choice:** `slack-app/` deployed via Deno Slack SDK to Slack managed infra
- **Reason:** Maximises Slack-native hosting per user preference
- **Considered alternatives:** Bolt on Node (self-hosted); full external service (loses Slack hosting)

### D3: External agent-service (Full D3) on Node.js + TypeScript

- **Choice:** `agent-service/` — Node.js 20+ + TypeScript + LangGraph.js; HTTP endpoint called by Slack Function
- **Reason:** Preserves agent flexibility (multi-step reasoning, clarification loops, future agents) without Slack Function time limits; LangGraph.js provides a robust foundation; shared types with Deno via `packages/shared`
- **Considered alternatives:** All-in-Slack agent in Deno (rejected — constrains agent options); Python agent-service (rejected — TypeScript preferred across project); LangSmith Agent Builder only (less control over TES rules); Run LangGraph inside Deno (immature)

### D3a: Deno/agent-service separation of concerns

- **Choice:** `slack-app/` is the Slack adapter (I/O only); `agent-service/` is the reasoning engine (no Slack API access)
- **slack-app responsibilities:** Triggers, modals, canvas/list CRUD, gate checks, file download from Slack, HTTP call to agent-service, apply structured response (canvas update, Block Kit proposals)
- **agent-service responsibilities:** Document parsing, LangGraph agent execution, LLM calls, TES rules (no-merge, scope, clarification)
- **Contract:** JSON over HTTP — shared types in `packages/shared`; no Slack tokens cross the boundary
- **Reason:** Testable agent logic in isolation; room for async/long-running work; Slack app stays stable as agents evolve

### D4: Slack objects as sole source of truth

- **Choice:** `TesEventContext` persisted in Dashboard canvas metadata JSON block; Requirements Canvas as session memory; lists for deliverables/incidents
- **Reason:** Aligns with Slack-native hosting; no sync layer
- **Considered alternatives:** Postgres SoT with Slack sync (complexity)

### D5: Requirements Canvas as intermediate memory

- **Choice:** Agent updates Requirements Canvas every session; proposals derived from canvas; second session extends without overwriting
- **Reason:** User-requested; bridges raw docs and Deliverables List; survives thread scroll
- **Considered alternatives:** Thread-only state (lost context); direct list writes (violates review gate)

### D6: Review-first deliverable promotion

- **Choice:** Block Kit Accept/Edit/Reject on proposal threads; list writes only on Accept
- **Reason:** User requirement; prevents agent hallucinations reaching delivery tracker
- **Considered alternatives:** Draft-in-list status (less control); auto-add on high confidence (rejected)

### D7: Channel @mention as MVP agent entry

- **Choice:** Primary invocation via @mention in TES Event Channel with file attachments; multi-turn in thread
- **Reason:** Visible to TES team; works without Assistant side panel API verification on dev tenant
- **Considered alternatives:** Slash command only; Assistant side panel (phase 2)

### D8: MVP trigger — manual shortcut

- **Choice:** TES global shortcut collects project name + optional pasted context; no Salesforce lookup
- **Reason:** Realistic for dev tenant MVP; full handoff is phase 2
- **Considered alternatives:** CRM-triggered creation; AE/SE self-service request

### D9: OpenAI-compatible LLM via environment config

- **Choice:** `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` env vars; `@langchain/openai` with configurable `baseURL`
- **Reason:** Vendor-agnostic; swap OpenAI, Azure OpenAI, Groq, Together, etc. without code changes
- **Considered alternatives:** Hard-coded OpenAI only (less flexible); multi-provider abstraction layer (over-engineered for MVP)

### D10: Render free tier for agent-service MVP

- **Choice:** Deploy `agent-service/` to Render free-tier web service
- **Reason:** Free to start; no serverless timeout limits (unlike Vercel)
- **Considered alternatives:** Vercel (rejected for agent-service — timeout limits on doc + LLM runs); Railway/Fly

### D11: AWS/Azure migration path for production agent-service

- **Choice:** Keep agent-service stateless and container-friendly from day one; migrate to company-standard AWS or Azure when official
- **Reason:** MVP cost minimization; production aligns with enterprise cloud policy
- **Considered alternatives:** Render paid tier long-term (may not meet company policy)

### D12: Slack Pro for MVP development

- **Choice:** Use Slack Pro workspace for MVP (Canvas, Lists, Slack-managed app deploy confirmed available)
- **Reason:** Pro license acquired; removes dev-tenant API availability risk
- **Considered alternatives:** Free dev tenant (Canvas/Lists uncertain); wait for Enterprise Grid (blocks MVP start)

## Risks / Trade-offs

- [Risk] Slack List/Canvas API regression on specific tenant → Mitigation: Task 1 API spike (`canvases.create`, `slacklists.create`); Pro plan eligibility confirmed
- [Risk] Doc processing timeouts in Slack Functions → Mitigation: heavy work in agent-service; Slack function posts status in thread
- [Risk] Shared types across Deno and Node → Mitigation: `packages/shared` with npm specifier in Deno
- [Risk] Deno Slack SDK vs Bolt Assistant API gap → Mitigation: @mention MVP; add Assistant side panel in phase 2
- [Trade-off] External agent-service breaks pure Slack hosting → Accepted: only component that must be external; minimal footprint

## Migration Plan

1. Install app on Slack Pro workspace; run Task 1 API spike
2. Deploy agent-service to Render; configure LLM env vars
3. TES runs smoke test checklist (provision → onboard → agent → accept → canvas)
4. Promote to Enterprise Grid with admin approval of outgoing domains (LLM, agent-service URL)
5. Migrate agent-service from Render to AWS or Azure per company policy
6. Rollback: disable app install; channels retain Slack-native content

## Open Questions

- Situation and Category select values for Deliverables List (defaults in implementation)
- Exact SailPoint suite → components mapping table content
- Delivery Template Canvas subsection catalog per Category (core structure agreed; details in templates)
- Document parser implementation — libraries, and whether slack-app sends raw bytes vs pre-processed content (behavior specified; approach deferred)
- Data residency and customer-data handling policy (future phase)
- Exact AWS vs Azure target for production agent-service (future phase)
