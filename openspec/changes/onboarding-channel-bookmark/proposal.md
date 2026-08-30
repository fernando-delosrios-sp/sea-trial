## Why

Slack lists every trigger a person may run in every channel they open. Per-channel `Complete Onboarding ({channelId})` therefore fills `#oppties` and grows with every TES Event Channel. The pinned index button cannot open the modal: block actions die when the seeding function completes (confirmed 2026-08-30). The remaining workable opener is one global shortcut that starts a live function, plus a Slack Datastore so that shortcut can load `TesEventContext` by the channel in view.

## What Changes

**Onboarding opener**
- From: per-channel Onboarding Link Trigger (and a non-working pinned button)
- To: one global `Complete onboarding` shortcut; `channel_id` from shortcut context; store `get`/`put` by that ID
- Reason: only a live function execution can open the modal; one name replaces N menu entries
- Impact: people in any TES Event Channel still see the shortcut in `#oppties`; a miss in the store fails clearly

**TES Event Context Store**
- From: snapshot in trigger inputs and pinned button value
- To: Slack Datastore item keyed by channel ID
- Reason: canvas markdown is unreadable; button value is not a live opener
- Impact: new manifest datastore; seed/open/submit/repair talk to it

**Onboarding Link Trigger**
- From: created per channel at seed
- To: never created; existing ones deleted; global shortcut granted to each TES Event Channel at seed
- Impact: breaking until repair `put`s a row and adds the channel grant

**Composition workflow steps**
- From: `kind: workflow` creates the per-channel trigger
- To: `workflow` kind rejected; `tes-event.json` has no workflow step
- Reason: that kind existed only for the per-channel trigger

**Dashboard / pinned index**
- From: Dashboard href = trigger share URL; pinned button treated as opener
- To: Dashboard onboarding task is instruction to use `Complete onboarding` (no `https://slack.com/shortcuts/` href). Pinned index is navigation and Publish situation report only — no Complete/Edit onboarding button
- Reason: those buttons cannot dispatch

**Existing channels**
- Repair `put`s a store row and grants the global shortcut to `CHANNEL_ID`
- Cleanup deletes `Complete Onboarding ({channelId})` and exact `Complete Onboarding`
- Out: hiding the global shortcut from `#oppties` for TES members; App Home; slash commands

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `channel-composition`: drop `workflow` kind and the per-channel trigger registry
- `event-channel`: seed writes the TES Event Context Store and grants the global shortcut; no per-channel trigger
- `onboarding`: open/submit via global shortcut and store; miss and non-TES channel fail clearly
- `ubiquitous-language`: retire Onboarding Link Trigger; add TES Event Context Store; restate entry point and snapshot
- `infrastructure`: Slack Datastore is Slack-native state; deploy enables `complete_onboarding`

## Impact

- `slack-app/manifest.ts` — DefineDatastore for TES Event Context Store
- `slack-app/lib/` — datastore client; seed `put` + trigger grant; open/submit `get`/`put`
- `packages/shared/src/types/index.ts` — drop `onboardingTriggerId` and `onboardingLinkUrl`
- `slack-app/triggers/complete_onboarding.ts` + `triggers.config.yaml` — enable global shortcut
- `slack-app/lib/onboarding-channel-trigger.ts`, `workflow-trigger-registry.ts` — delete per-channel create path
- `slack-app/content/channels/tes-event.json` — drop workflow step
- `slack-app/content/messages/pinned-index.hbs.json` — no onboarding action button
- `slack-app/content/canvases/dashboard.hbs.md` — no shortcut URL
- `slack-app/scripts/cleanup-onboarding-triggers.ts` — match per-channel titles
- `slack-app/scripts/repair-workflow-tab.ts` — `put` + grant
- `docs/smoke-test-checklist.md`, `README.md`, `CHANGELOG.md`
- agent-service unchanged
