# Retrospective — Complete Provisioning Trigger

**Date:** 2026-08-07

## What went well

- TDD micro-task plan mapped cleanly to incremental commits (types → modal → wiring → provision → dashboard → onboarding).
- Deno Slack SDK `addViewSubmissionHandler` + `completeSuccess` pattern worked well for creation modal → workflow step outputs.
- Shared lib extraction (`create-tes-event-submit`, `onboarding-modal`, `onboarding-view-submit`) kept SlackFunction handlers thin and testable.

## What was harder than expected

- **Block action routing:** Pinned index button required `addBlockActionsHandler` on `open_onboarding` plus canvas read via button `value` (dashboard canvas ID). Link trigger file documents deploy steps; runtime depends on handler registration after deploy.
- **Workflow input shape:** Top-level workflow inputs for all five creation fields conflict with modal-collected data in this SDK; resolved by making `open_create_tes_event` workflow step 1 with step outputs.
- **Worktree baseline:** Fresh worktree needed `npm run build` for observability dist and a pre-existing observability test assertion fix.

## Decisions worth remembering

- Account field uses block_id `account_name` (renamed from `customer_name`) with label "Account".
- Onboarding submit overwrites `TesEventContext.accountName` from form (creation default is editable).
- Agent remains summon-only — no invoke path on provision or onboarding submit.

## Follow-ups

- [ ] Manual smoke in dev workspace (task 6.3)
- [ ] Confirm block action handler fires for pinned button after deploy (may need link trigger create)
- [ ] Consider `readCanvasMarkdown` fallback if section lookup misses metadata block
