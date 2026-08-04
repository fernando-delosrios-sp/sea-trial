## Why

TES event delivery today lacks a structured, Slack-native workflow. Sales Engineers bring raw requirement documents in varied formats, and the TES team manually shapes deliverables with no shared source of truth, no scope gate, and no review-controlled handoff to delivery tracking. This slows PoC/PoV engagements, loses context between sessions, and makes it hard for AE/SE stakeholders to see progress. A Slack-native platform with an AI Requirements Agent addresses the highest-friction step first — turning unstructured inputs into scoped, reviewable deliverables — while laying groundwork for future agents and Salesforce integration.

## What Changes

- **New TypeScript monorepo** with Deno Slack SDK app (Slack I/O), Node.js LangGraph agent-service (reasoning), and shared types in `packages/shared`
- **TES Event Channel provisioning** via global shortcut (`#proj-{custom-name}-tes`) with seeded canvases, lists, and pinned index
- **Onboarding modal** for AE/SE inside the channel; updates Dashboard canvas and opens agent gate
- **Requirements Canvas** as living intermediate memory between agent sessions
- **Requirements Agent** processes uploaded documents, proposes deliverables, enforces no-merge and scope rules
- **Review gate** — Deliverables List writes only on explicit user acceptance
- **On-demand Delivery Template Canvas** linked per accepted deliverable row

**From:** Manual, ad hoc requirement handling in opportunity threads
**To:** Structured TES Event Channels with onboarding gate, Requirements Canvas, and review-gated deliverables
**Reason:** Streamline TES delivery and preserve requirement integrity
**Impact:** Non-breaking (greenfield); requires Slack dev tenant app install

## Capabilities

### New Capabilities

<!-- All capabilities pre-defined in openspec/specs/ — this change implements them -->

- `event-channel`: TES Event Channel provisioning, object seeding, canvas/list helpers
- `onboarding`: AE/SE onboarding modal, suite-to-components mapping, agent gate
- `requirements-agent`: Document parsing, LangGraph Requirements Agent, Slack invocation, Requirements Canvas sync
- `deliverables`: Review gate, Deliverables List writes, on-demand Delivery Template Canvas
- `infrastructure`: Tech stack, subscriptions, LLM config, agent-service hosting, deployment targets

### Modified Capabilities

<!-- No existing requirement changes — greenfield implementation -->

## Impact

- **New directories:** `slack-app/`, `agent-service/`, `packages/shared/`
- **Slack APIs:** Canvas create/edit, Lists CRUD, channels:manage, files:read, chat:write
- **External services:** OpenAI-compatible LLM (`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`), Render-hosted agent-service (MVP)
- **Slack scopes:** channels:manage, canvases:read/write, lists:read/write, files:read, users:read, chat:write
- **Slack workspace:** Pro for MVP; Enterprise Grid for production rollout
- **Documentation:** README, `.env.example`, smoke test checklist, `docs/tech-stack-requirements.md`
