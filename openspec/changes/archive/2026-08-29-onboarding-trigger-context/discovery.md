## Scope

**In:** Bake a seed-time `TesEventContext` snapshot into the per-channel Onboarding Link Trigger (and the pinned index button value) so opening and submitting onboarding never reads canvas markdown; submit merges the form onto that snapshot and rewrites the Dashboard the same way channel create does. Remove diagnostic canvas-read probes and the unused `SLACK_WORKSPACE_DOMAIN` allowlist. **Out:** Slack datastore; changing how delivery canvases or Situation Report remember prior markdown; reconstructing snapshots for already-seeded channels from canvas content (Slack cannot return it).

## Language

**TesEventContext** (canonical):
The TES Event Channel record: creation fields, object IDs, onboarding state, and optional composition metadata.
_Avoid_: canvas markdown as the readable source of this record

**Onboarding Link Trigger** (`promote` — Notes):
A channel-scoped shortcut trigger named `Complete Onboarding ({channelId})` whose baked inputs include `channel_id`, `dashboard_canvas_id`, and a serialized seed-time `TesEventContext` snapshot; its `share_url` remains the Dashboard Complete onboarding href.
_Avoid_: treating the trigger as a cloned workflow; treating `dashboard_canvas_id` as sufficient to open the modal

**Trigger context snapshot** (`promote`):
The serialized `TesEventContext` frozen into Onboarding Link Trigger inputs (and the pinned index button) at seed time. It is creation-time context plus object IDs, not live canvas markdown.
_Avoid_: baking full Dashboard markdown; calling this a workflow copy

**Open Onboarding workflow** (canonical, Notes):
A single app workflow (`open_onboarding_workflow`). Channel create does not clone it; each channel gets a distinct trigger pointing at that workflow.
_Avoid_: master/copy of the workflow per channel

## Decisions

Context: Live Slack showed Dashboard-link onboarding fails after baking `dashboard_canvas_id`. `canvases.sections.lookup` returns section IDs only (`anySectionHasMarkdown: false`); mixing `any_header` with `h1`/`h2`/`h3` is `invalid_arguments`. `files.info` + `url_private_download` returns HTTP 403 HTML for `filetype: quip`. `canvases:read` is already granted and is not the gap. User chose **bake creation context into the per-channel trigger** rather than a datastore or targeted section-only edits.

1. **Workflow vs trigger** — One Open Onboarding workflow; per-channel trigger is the copy that carries inputs.
2. **What to bake** — Serialized `TesEventContext` at seed (same shape `serializeEventContext` / `deserializeEventContext` already use), not canvas document markdown. Keep `channel_id` and `dashboard_canvas_id`.
3. **Submit** — Merge onboarding form onto the snapshot (`processOnboardingSubmit` / `applyOnboarding`); rewrite Dashboard via existing `replaceCanvasContent` / `renderDashboardCanvasForSlack`. No canvas read.
4. **Pinned index** — Same snapshot in the Complete onboarding button value so the fallback path does not call `readCanvasMarkdown`.
5. **Snapshot freshness** — Frozen at seed until onboarding submit. Create-time Account/project/members are exactly what must not be collected twice; post-seed canvas edits are not reflected in the modal.
6. **Existing channels** — Cannot recover context from canvases. Repair may accept an explicit serialized context; otherwise operators re-seed. Not a datastore.
7. **Diagnostics** — Remove lookup/`files.info` probes and `SLACK_WORKSPACE_DOMAIN` (download path is dead).
8. **Other canvas readers** — Delivery consolidation still cannot read prior markdown. Explicitly out of this change.

## Open questions

None blocking. Deferred: durable store for delivery-canvas consolidation; deleting the Onboarding Link Trigger after submit; Slack trigger input byte limits if `TesEventContext` grows (seed payload is IDs and names today).

## Scenarios discussed

- Fresh provision: trigger inputs include snapshot; Dashboard link opens modal with Account prefill without canvas lookup.
- Submit uses snapshot IDs to rewrite Dashboard; `onboardingComplete` true; onboarding CTA section omitted.
- Pinned index button opens the same modal from the same snapshot.
- Missing snapshot (old trigger with only canvas ID) fails clearly — do not fall back to `readCanvasMarkdown`.
- Shared global Complete Onboarding remains disabled and still cannot carry a snapshot.
- Repair without supplied snapshot cannot invent `TesEventContext`.
- Probe logs (`canvas.read.lookup.probe`, `canvas.files.info.probe`) must not remain in production paths.
