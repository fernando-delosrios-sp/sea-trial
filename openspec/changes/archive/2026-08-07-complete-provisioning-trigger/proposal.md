## Why

The MVP provisioning entry point was scaffolded but never finished: the "Create TES Event" shortcut does not open a modal, member IDs are empty, and manually inviting the bot to a channel skips canvas/list seeding. TES team members cannot start the intended workflow from Slack. This blocks dogfooding and makes the Requirements Agent unreachable in practice because `TesEventContext` is never initialized.

## What Changes

**Provisioning trigger**
- From: Shortcut trigger with broken inputs (`ae_user_id`/`se_user_id` empty; project name from shortcut text input)
- To: Global shortcut opens a creation modal; submit runs provision → seed workflow with validated inputs
- Reason: Match user expectation and event-channel spec intent
- Impact: Non-breaking for agent-service; slack-app trigger and provision flow change

**Creation modal**
- From: No modal; partial workflow inputs
- To: Modal collects project name, Account, Salesforce opportunity URL, initial members (multi-select), optional context notes
- Reason: TES operational context captured at channel birth
- Impact: New function or interactivity handler; extends `TesEventContext`

**Dashboard at creation**
- From: Dashboard populated only after onboarding fields exist
- To: `## Project` section written at seed time with creation fields; Opportunity Details after onboarding
- Reason: Single source of truth for TES-entered context
- Impact: Template and seed function changes

**Onboarding entry**
- From: Pinned index text CTA; optional `/tes-onboard` shortcut
- To: Primary entry via Block Kit button on pinned index; Account pre-filled and editable
- Reason: User preference for button-driven flow
- Impact: Pinned index blocks + open_onboarding pre-fill

**Terminology**
- From: `customerName` / customer labels in UI
- To: **Account** in user-facing copy and glossary; `accountName` in shared types
- Reason: Unified term across creation and onboarding
- Impact: Shared types, templates, modal labels

**Agent invocation clarity**
- From: Copy implies agent "runs" after onboarding
- To: Explicit summon-only `@mention` language; no auto-invoke on provisioning or onboarding
- Reason: SE controls when agent processes documents
- Impact: Copy and requirements-agent spec clarification only

## Capabilities

### New Capabilities

_(none — extends existing capabilities)_

### Modified Capabilities

- `event-channel`: Creation modal, member multi-select, dashboard Project section at seed, trigger wiring
- `onboarding`: Button CTA on pinned index; Account pre-fill (editable); remove redundant customer capture semantics
- `ubiquitous-language`: Add Account term; update Onboarding definition
- `requirements-agent`: Clarify summon-only invocation (no auto-run)

## Impact

- `packages/shared/src/types/index.ts` — extend `TesEventContext`; rename `customerName` → `accountName` in `OnboardingForm`
- `slack-app/triggers/create_tes_event.ts` — wire shortcut to modal workflow
- `slack-app/functions/` — new or extended open/submit creation modal; update `provision_channel`, `seed_channel_objects`
- `slack-app/templates/index.ts` — dashboard Project section; pinned index button blocks
- `slack-app/functions/open_onboarding/mod.ts`, `submit_onboarding/mod.ts` — Account pre-fill
- `slack-app/tests/` — provision, onboarding, event-context, template tests
- `docs/smoke-test-checklist.md` — update provisioning steps
- No agent-service API changes
