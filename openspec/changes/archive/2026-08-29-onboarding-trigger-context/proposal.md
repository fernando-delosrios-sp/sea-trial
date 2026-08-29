## Why

Dashboard Complete onboarding still fails in the live workspace after baking `dashboard_canvas_id`. Slack `canvases.sections.lookup` returns section IDs only, and canvas file download returns 403 for Quip documents — so the modal cannot recover `TesEventContext` from the Dashboard. Channel create already has that record and already creates a per-channel trigger. Baking a seed-time snapshot into the trigger (and pinned button) lets onboarding open and submit without reading canvases, while still rewriting the Dashboard on submit.

## What Changes

**Onboarding Link Trigger inputs**
- From: Baked `channel_id` and `dashboard_canvas_id` only; open path then calls `readCanvasMarkdown`
- To: Also bake a serialized seed-time `TesEventContext` snapshot (same serialize/deserialize shape as Dashboard metadata). Open and submit use the snapshot; they SHALL NOT read canvas markdown
- Reason: Canvas content is not readable to the app
- Impact: Behavior change for AE/SE; existing triggers without a snapshot stay broken until re-seed or explicit repair payload

**Pinned index button**
- From: Button value is Dashboard canvas ID; handler reads canvas
- To: Button value carries the same snapshot (plus canvas ID as needed for writes already on the context)
- Reason: Fallback CTA must not depend on canvas read
- Impact: Pinned index Block Kit value shape change

**Submit write path**
- From: Deserialize context from canvas markdown, then replace Dashboard
- To: Deserialize from the snapshot, merge form, replace Dashboard as channel create already does
- Reason: Same write API; no read required
- Impact: Non-breaking for agent-service

**Diagnostics leftover**
- From: Temporary lookup/`files.info` probes and optional `SLACK_WORKSPACE_DOMAIN` outgoing domain
- To: Removed; no workspace-subdomain allowlist for canvas download
- Reason: Download path is a 403; probes must not stay in production
- Impact: Local `.env` / manifest wiring only

**Existing channels / repair**
- From: Repair recreates trigger with canvas ID
- To: Repair MAY accept an explicit serialized snapshot; it SHALL NOT invent context from canvas content
- Reason: Canvas read is impossible
- Impact: Operators re-seed or supply snapshot

**Out of this change**
- Slack datastore; delivery / Situation Report markdown round-trip; cloning the Open Onboarding workflow per channel (it remains one workflow)

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `event-channel`: Seeding bakes the trigger context snapshot into the Onboarding Link Trigger (and pinned button)
- `channel-composition`: `open_onboarding_workflow` provision creates the per-channel trigger with snapshot, not a shared deploy-time trigger
- `onboarding`: Open/submit use the snapshot; no canvas markdown read; missing snapshot fails clearly
- `ubiquitous-language`: Onboarding Link Trigger notes; add Trigger context snapshot term

## Impact

- `slack-app/lib/onboarding-channel-trigger.ts` — bake serialized context
- `slack-app/lib/content/channel-provisioner.ts` — pass context into trigger create and pinned button
- `slack-app/functions/open_onboarding/mod.ts` — open/submit from snapshot; remove probes
- `slack-app/lib/onboarding-view-submit.ts` — button path uses snapshot
- `slack-app/lib/outgoing-domains.ts`, `manifest.ts` — drop workspace domain param
- `slack-app/scripts/repair-workflow-tab.ts` — optional snapshot env; no canvas read
- `slack-app/tests/` — trigger bake, open without lookup, submit from snapshot
- `docs/smoke-test-checklist.md` — Dashboard link plus Account prefill from create
- agent-service unchanged
