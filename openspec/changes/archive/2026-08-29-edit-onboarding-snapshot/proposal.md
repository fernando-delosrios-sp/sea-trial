## Why

The Dashboard Complete onboarding link now stays after submit so AE/SE can edit opportunity details. The Onboarding Link Trigger still bakes a seed-time `TesEventContext` snapshot, so a second open prefills creation Account only and ignores the submitted form. Refreshing that snapshot on every successful submit makes the kept link a working edit path without a datastore or canvas read.

## What Changes

**Trigger context snapshot lifetime**
- From: Compact JSON baked at channel create (and after trigger create for `onboardingLinkUrl`); unchanged after onboarding submit
- To: Same compact JSON, rewritten on every successful onboarding submit to the post-submit `TesEventContext`
- Reason: Dashboard link after complete must open a modal that matches Opportunity Details
- Impact: Behavior change for AE/SE on later opens; existing channels without `onboardingTriggerId` cannot refresh until re-seed or repair

**Onboarding open prefill**
- From: Account only from snapshot `accountName`
- To: All onboarding fields from snapshot `onboarding` when present; otherwise Account-only as today
- Reason: Edit must restore suite, stakeholders, dates, notes, etc.
- Impact: Non-breaking for first-time open

**Onboarding re-submit**
- From: Submit always treats the flow as first complete (agent-available channel message every time)
- To: Same Dashboard replace and `onboardingComplete: true`; agent-available message only on the first transition to complete; later submits skip that announcement
- Reason: Avoid duplicate “agent is available” noise on edits
- Impact: Behavior change for AE/SE

**TesEventContext identity for trigger update**
- From: Submit has compact snapshot but not necessarily the Slack trigger id
- To: Provision bakes `onboardingTriggerId` (with `onboardingLinkUrl`) so submit can `workflows.triggers.update`
- Reason: Must not list-and-guess among workspace triggers
- Impact: Shared type + seed snapshot grow by one id field

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `onboarding`: Prefill from latest snapshot; submit refreshes trigger snapshot; first-complete announcement only; still no canvas read
- `event-channel`: Seed snapshot includes `onboardingTriggerId` (and keeps `onboardingLinkUrl`) so later submit can update the trigger
- `ubiquitous-language`: Trigger context snapshot is latest successful submit, not seed-only freeze; Onboarding notes cover edit via Dashboard link

## Impact

- `packages/shared` — optional `onboardingTriggerId` on `TesEventContext`
- `slack-app/lib/onboarding-channel-trigger.ts` — bake trigger id into snapshot on create/update
- `slack-app/lib/content/channel-provisioner.ts` — persist id on context after workflow step
- `slack-app/lib/onboarding-view-submit.ts` / `open_onboarding` / modal compiler — full-field prefill; submit updates trigger; gated announcement
- `slack-app/scripts/repair-workflow-tab.ts` — persist id + URL into snapshot when repairing
- `slack-app/tests` — open prefill after complete; submit updates trigger; second submit no duplicate announcement
- `docs/smoke-test-checklist.md` — edit path after first submit
- agent-service unchanged; no datastore
