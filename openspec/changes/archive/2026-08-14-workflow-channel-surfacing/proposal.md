## Why

Workflow steps in the channel manifest currently register onboarding by creating a new Slack shortcut trigger on every channel provision. That produces duplicate "Complete Onboarding" entries in the workspace shortcut palette (one per TES Event channel) and does not declare how the workflow should surface in the channel. Slack distinguishes **featured workflows** (composer button) from **bookmarked workflows** (Workflows tab list) — distinct from header Bookmarks used for lists. Onboarding should appear as a bookmarked workflow in the channel Workflows tab, with run access limited to that channel, using a single shared deploy-time trigger rather than per-channel trigger creation.

## What Changes

**Workflow step surfacing flags**
- From: Workflow steps allow only `link`; provisioner always creates a new channel trigger
- To: Workflow steps MAY declare opt-in `bookmark: true` (Workflows tab bookmarked) and/or `featured: true` (Workflows tab featured via `workflows.featured.add`); list `bookmark` semantics unchanged (header bar)
- Reason: Align manifest with Slack Workflows tab surfaces
- Impact: Non-breaking for steps without flags; schema and resolver validation extended

**Shared onboarding trigger**
- From: `workflows.triggers.create` per channel with hardcoded `channel_id` and `dashboard_canvas_id`
- To: Reuse one deploy-time link trigger; per-channel provision grants channel access via `workflows.triggers.permissions.add` and applies bookmark/featured surfacing
- Reason: Eliminate duplicate shortcuts; channel context from invoke-time shortcut context
- Impact: Behavior change for onboarding discovery; existing orphan triggers remain until manual cleanup

**Onboarding manifest**
- From: `{ "id": "onboarding", "kind": "workflow", "link": "open_onboarding_workflow" }`
- To: same with `"bookmark": true`
- Reason: Declarative surfacing intent
- Impact: Non-breaking provisioning outcome when shared trigger model works

**Deploy trigger config**
- From: `complete-onboarding` global trigger disabled; runtime create only
- To: Deploy provisions stable onboarding link trigger; provisioner resolves trigger ID by link key
- Reason: Single trigger identity across channels
- Impact: Deploy step may enable `complete-onboarding` or record trigger ID for runtime

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `channel-composition`: Workflow step `bookmark` and `featured` flags; kind-scoped schema; workflow surfacing requirements separate from list header bookmarks
- `event-channel`: Channel seeding provisions workflow surfacing via shared trigger + channel permissions, not per-channel trigger create
- `onboarding`: Onboarding accessible from Workflows tab bookmarked list when manifest declares workflow bookmark

## Impact

- `slack-app/lib/onboarding-channel-trigger.ts` — refactor to shared trigger + permissions + optional featured.add
- `slack-app/lib/content/channel-provisioner.ts` — workflow step reads bookmark/featured flags
- `slack-app/lib/content/composition-resolver.ts` — parse/validate workflow bookmark and featured
- `slack-app/schemas/content/composition.schema.json` — workflow kind conditionals
- `slack-app/content/channels/tes-event.json` — onboarding `bookmark: true`
- `slack-app/triggers/complete_onboarding.ts`, `triggers.config.yaml` — deploy-time shared trigger
- `slack-app/tests/composition_test.ts`, `onboarding_channel_trigger_test.ts`, provisioner integration tests
- `docs/smoke-test-checklist.md` — Workflows tab bookmarked onboarding check
