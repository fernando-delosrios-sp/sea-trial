## 1. Monorepo scaffold

- [x] 1.1 Create root workspace with `slack-app/`, `agent-service/`, `packages/shared/`
- [x] 1.2 Define shared types in `packages/shared/src/types/index.ts` (`DeliverableStatus`, `OnboardingForm`, `TesEventContext`, `DeliverableProposal`)
- [x] 1.3 Scaffold Deno Slack SDK app with manifest and empty test runner
- [x] 1.4 Scaffold agent-service with TypeScript, LangGraph.js, and vitest/jest
- [x] 1.5 Add `.env.example` for both services

## 2. Event channel provisioning

- [x] 2.1 Implement global shortcut trigger and project name modal (event-channel: Successful channel creation)
- [x] 2.2 Implement channel slug validation and error handling (event-channel: Invalid project name)
- [x] 2.3 Implement AE/SE user invite on channel creation
- [x] 2.4 Implement `seed_channel_objects` function (event-channel: Objects seeded on creation)
- [x] 2.5 Implement Dashboard metadata block read/write for `TesEventContext` (event-channel: Metadata round-trip)
- [x] 2.6 Implement `createCanvas` and `updateCanvasSection` helpers (event-channel: Create/Update canvas)
- [x] 2.7 Post pinned index message with onboarding CTA

## 3. Onboarding

- [x] 3.1 Implement onboarding modal with all required fields (onboarding: Open onboarding form)
- [x] 3.2 Implement submit handler updating Dashboard and `TesEventContext` (onboarding: Submit onboarding)
- [x] 3.3 Implement `deriveComponents` suite mapping (onboarding: Identity Security Cloud mapping)
- [x] 3.4 Implement agent gate blocking @mention before onboarding (onboarding: Agent blocked)
- [x] 3.5 Verify agent proceeds after onboarding complete (onboarding: Agent available)

## 4. Document parsing

> Parser libraries and transport (raw bytes vs pre-processed) deferred — behavior per spec.

- [x] 4.1 Implement PDF parser (requirements-agent: Supported format parsing)
- [x] 4.2 Implement DOCX, XLSX, and plain text parsers
- [x] 4.3 Implement unsupported format graceful rejection (requirements-agent: Unsupported format handling)

## 5. Requirements Agent

- [x] 5.1 Implement LangGraph Requirements Agent graph with loadContext, parseDocuments, analyzeRequirements, clarifyOrPropose nodes
- [x] 5.2 Implement POST `/agents/requirements/process` endpoint (requirements-agent: Process requirements endpoint)
- [x] 5.3 Add no-merge rule tests (requirements-agent: No-merge rule enforcement)
- [x] 5.4 Add out-of-scope flagging (requirements-agent: Out-of-scope rejection)
- [x] 5.5 Add clarification path (requirements-agent: Clarification path)

## 6. Slack agent invocation

- [x] 6.1 Implement @mention handler with file download and agent-service call (requirements-agent: Successful agent run)
- [x] 6.2 Update Requirements Canvas from agent output
- [x] 6.3 Post Block Kit proposal thread with Accept/Edit/Reject buttons
- [x] 6.4 Implement thread reply re-invocation (requirements-agent: Multi-turn thread continuation)
- [x] 6.5 Preserve prior canvas content across sessions (requirements-agent: Second session extends canvas)

## 7. Review gate and deliverables

- [x] 7.1 Implement Accept handler creating list rows (deliverables: Accept creates list item)
- [x] 7.2 Implement Reject handler with no list write (deliverables: Reject does not write)
- [x] 7.3 Verify no write without button click (deliverables: No write without interaction)
- [x] 7.4 Populate core schema fields on accept (deliverables: Core fields populated)
- [x] 7.5 Mark promoted candidates in Requirements Canvas (deliverables: Candidate promoted on accept)
- [x] 7.6 Create Delivery Template Canvas on accept and link in list (deliverables: Canvas created on accept)
- [x] 7.7 Verify no canvas for unaccepted rows (deliverables: No canvas for empty rows)

## 8. Tests and smoke test

- [x] 8.1 Add automated tests for no-merge, scope, and clarification rules
- [ ] 8.2 Run end-to-end smoke test checklist in Slack dev tenant *(manual — see docs/smoke-test-checklist.md)*
- [x] 8.3 Run `openspec validate --all --json` and fix any invalid items

## 9. Documentation

- [x] 9.1 Update README with setup, env vars, and dev tenant install steps
- [x] 9.2 Document agent-service API contract (`POST /agents/requirements/process`) in README or `agent-service/README.md`
- [x] 9.3 Add JSDoc to public helpers (`createCanvas`, `deriveComponents`, `parseDocument`)

## 10. Changelog

- [x] 10.1 Create or update changelog entry for TES Slack Process MVP
- [x] 10.2 Confirm entry covers channel provisioning, onboarding, Requirements Agent, and review gate
