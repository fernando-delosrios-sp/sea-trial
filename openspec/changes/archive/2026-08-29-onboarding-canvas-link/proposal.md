## Why

App slash commands cannot be added to the Slack Workflows folder, and associating a shared deploy-time trigger does not populate that tab for this app. Channel members therefore have no reliable Workflows-tab path to onboarding. The Dashboard canvas already has an Onboarding CTA, but it currently receives a fabricated shortcut URL (missing the secret path segment) and a shared trigger that cannot carry `dashboard_canvas_id` from a canvas click. Fixing the canvas link with a per-channel trigger that bakes channel and Dashboard IDs restores a discoverable, working entry point without pretending slash commands or the Workflows tab work.

## What Changes

**Onboarding discovery surface**
- From: Pinned index button plus Workflows tab bookmark/featured of a shared Complete Onboarding trigger
- To: Dashboard canvas Onboarding tasks checklist entry as the discoverable CTA; pinned index Complete onboarding button remains as fallback
- Reason: Slack documents canvas, message, and bookmark as link-trigger surfaces; Workflows tab does not work for this app workflow
- Impact: Behavior change for AE/SE; smoke tests and onboarding spec drop Workflows tab

**Per-channel Onboarding Link Trigger**
- From: Shared deploy-time trigger (`complete-onboarding` enabled) plus optional runtime create only when `bookmark: true`
- To: Channel provision always creates a shortcut trigger named `Complete Onboarding ({channelId})` with baked `channel_id` and `dashboard_canvas_id`, grants channel-only run access, and writes the API `share_url` onto the Dashboard
- Reason: Canvas clicks do not supply reliable shortcut context data; dashboard ID must be baked
- Impact: One trigger per TES Event Channel; titles must not collide with CI/cleanup matching on `Complete Onboarding`

**Shortcut URL integrity**
- From: `resolveWorkflowTriggerShareUrl` synthesizes `https://slack.com/shortcuts/{id}` and deploy syncs that into `SLACK_ONBOARDING_TRIGGER_URL`
- To: Use create-response `share_url` or `shortcut_url` only; never fabricate a URL from ID; stop syncing `SLACK_ONBOARDING_TRIGGER_URL` from ID-only `slack trigger list` output
- Reason: Real shortcut URLs include a secret path segment; ID-only URLs are dead links
- Impact: Env var remains a manual override only

**Workflow composition flags**
- From: Workflow steps MAY set `bookmark: true` / `featured: true` for Workflows tab surfacing
- To: Workflow steps are `{ id, kind, link }` only; `bookmark` and `featured` SHALL be rejected on workflow steps (list header `bookmark` and canvas `tab` unchanged)
- Reason: Those flags cannot be honoured
- Impact: Breaking for `tes-event.json` workflow step shape; composition schema and resolver validation change

**Shared global onboarding trigger**
- From: `complete-onboarding` enabled in `triggers.config.yaml`
- To: `complete-onboarding` disabled; `tes-onboard` remains disabled
- Reason: Shared trigger cannot resolve Dashboard content
- Impact: Workspace shortcut palette no longer advertises a broken Complete Onboarding entry

**Existing channels**
- Repair script creates the per-channel trigger and rewrites the Dashboard onboarding link for a given `CHANNEL_ID` / Dashboard canvas ID
- Out of this change: header bookmark for onboarding, App Home, slash commands, deleting the trigger after submit, resolving Dashboard from `channel_id` alone

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `channel-composition`: Remove workflow `bookmark`/`featured`; provisioner always creates a per-channel Onboarding Link Trigger for `open_onboarding_workflow`
- `event-channel`: Seeding writes a real trigger `share_url` into the Dashboard onboarding section; no Workflows tab association
- `onboarding`: Modal accessible from Dashboard canvas link and pinned index button; drop Workflows tab requirement
- `ubiquitous-language`: Fix Onboarding Notes (`/tes-onboard`); add Onboarding Link Trigger; note Dashboard canvas CTA

## Impact

- `slack-app/content/channels/tes-event.json` — onboarding step without bookmark/featured
- `slack-app/lib/content/composition-resolver.ts` — reject workflow bookmark/featured
- `slack-app/schemas/content/composition.schema.json` — workflow kind conditionals
- `slack-app/lib/onboarding-channel-trigger.ts` — always `createChannelOnboardingTrigger`; drop featured/shared association path
- `slack-app/lib/content/channel-provisioner.ts` — pass share URL to `finalizeDashboardCanvas`
- `slack-app/lib/workflow-trigger-registry.ts`, `onboarding-canvas-link.ts` — no fabricated URLs
- `slack-app/triggers.config.yaml` — `complete-onboarding` disabled
- `slack-app/scripts/repair-workflow-tab.ts` — backfill trigger + Dashboard link
- `slack-app/tests/composition_test.ts`, `onboarding_channel_trigger_test.ts`, canvas-link tests
- `docs/smoke-test-checklist.md`, `README.md` — Dashboard link instead of Workflows tab
- agent-service unchanged; Slack-native state model unchanged
