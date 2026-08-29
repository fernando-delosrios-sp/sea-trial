## Context

Onboarding is opened from a per-channel Onboarding Link Trigger (Dashboard markdown link) or the pinned index button. Both currently try to load `TesEventContext` by reading Dashboard markdown. Live traces on `F0BSD0XHK53` showed `canvases.sections.lookup` returns `{ id }` only, and `url_private_download` returns HTTP 403 HTML for `filetype: quip`. Channel create already holds `TesEventContext` when it creates the trigger. Slack-app remains the only Slack adapter; agent-service is unchanged. State stays Slack-native (trigger inputs, button value, Dashboard write) — no datastore.

## Goals / Non-Goals

**Goals:**

- Open the onboarding modal from Dashboard link and pinned index using a seed-time `TesEventContext` snapshot, with Account prefill, without canvas read
- Submit merges the form onto that snapshot and replaces Dashboard content the same way seeding does
- Fail clearly if a trigger or button has no snapshot (no silent `readCanvasMarkdown` fallback)
- Remove diagnostic probes and `SLACK_WORKSPACE_DOMAIN`

**Non-Goals:**

- Slack datastore or any external DB
- Making `readCanvasMarkdown` work for delivery canvases / Situation Report
- Cloning `open_onboarding_workflow` per channel
- Auto-migrating already-seeded channels whose triggers lack a snapshot

## Decisions

### D1: Snapshot lives on the trigger, not a workflow copy

- **Choice**: Keep a single Open Onboarding workflow. Bake the snapshot into each channel’s Onboarding Link Trigger inputs (`channel_id`, `dashboard_canvas_id`, serialized context).
- **Reason**: Create already copies the trigger, not the workflow.
- **Considered alternatives**: Per-channel workflow clone (unsupported / unnecessary); datastore (out of scope, conflicts with “Slack-native state only”).

### D2: Serialize compact JSON, same deserialize as metadata

- **Choice**: Bake `JSON.stringify(TesEventContext)` (no pretty-print, no full Dashboard markdown). `deserializeEventContext` SHALL accept this JSON object string as well as the existing `<!-- tes-event-context -->` fenced block so Dashboard metadata writes stay unchanged.
- **Reason**: Block Kit button `value` is capped at 2000 characters; view `private_metadata` at 3000. Pretty-printed metadata markdown can blow the button cap. Compact JSON of seed-time fields (IDs and names) fits.
- **Considered alternatives**: Bake `serializeEventContext` markdown (too large for the button); bake only `accountName` (submit still needs object IDs to rewrite Dashboard).

### D3: Reuse workflow input `dashboard_canvas_content`

- **Choice**: Put the compact snapshot in the existing `dashboard_canvas_content` workflow input (name is historical). Open copies it into modal `private_metadata`. Submit deserializes it and does not call `readCanvasMarkdown`.
- **Reason**: No new workflow input / remapping of existing triggers’ unused field.
- **Considered alternatives**: New `tes_event_context` input (clearer name, extra manifest churn).

### D4: Pinned button carries the same compact JSON

- **Choice**: `buttonValueJson` includes `dashboard_canvas_content` (compact snapshot). If the payload would exceed 2000 characters, seeding SHALL fail rather than truncate or fall back to canvas ID-only.
- **Reason**: Fallback CTA must not reintroduce canvas read.
- **Considered alternatives**: ID-only button (known broken); datastore lookup from `channel_id`.

### D5: Missing snapshot is a hard error

- **Choice**: If snapshot is absent or will not deserialize, return a user-visible error telling operators to re-run Create TES Event (or repair with an explicit snapshot). Do not call `readCanvasMarkdown` on open or submit.
- **Reason**: Canvas read is proven non-functional; fallback would hide the real failure.
- **Considered alternatives**: Keep lookup as fallback (rejected).

### D6: Repair does not read canvases

- **Choice**: Repair script creates/updates the trigger only when `TES_EVENT_CONTEXT_JSON` (or equivalent) is supplied. Without it, fail with instructions to re-seed.
- **Reason**: Canvas content cannot be recovered.
- **Considered alternatives**: Partial repair (IDs only) — leaves onboarding broken.

### D7: Strip diagnostics

- **Choice**: Remove lookup/`files.info` probes from `canvas.ts` / `open_onboarding`; revert `buildOutgoingDomains` workspace-domain parameter and `SLACK_WORKSPACE_DOMAIN`.
- **Reason**: 403 on download; production must not log probes.
- **Considered alternatives**: Keep allowlist “just in case” (dead path).

## Risks / Trade-offs

- [Risk] Trigger or button payload exceeds Slack size limits as `TesEventContext` grows → Mitigation: compact JSON; fail seed if over 2000 on the button; keep seed payload IDs/names only
- [Risk] Existing channels stay broken until re-seed → Mitigation: document in smoke checklist and repair script header
- [Risk] Snapshot is stale vs later canvas edits before onboarding → Mitigation: accepted; create-time fields are the ones we must not collect twice
- [Trade-off] Dashboard metadata block remains write-only for the app → Reason: still useful as a human-visible dump; not the open/submit source
- [Trade-off] `readCanvasMarkdown` remains in the codebase for other flows → Reason: delivery consolidation is out of scope; do not pretend it works for onboarding

## Migration Plan

1. Implement snapshot bake + open/submit without canvas read; strip probes.
2. `deno task test` in `slack-app/` (agent-service untouched).
3. `slack deploy` slack-app; provision a **new** TES Event Channel; click Dashboard Complete onboarding and pinned button; submit; confirm Dashboard Opportunity Details and agent-gate copy.
4. Old channels: re-run Create TES Event or repair with explicit JSON. Rollback: redeploy previous slack-app; old triggers without snapshot remain as they are today.

## Open Questions

None blocking. Watch trigger/button size if context fields grow. Delivery-canvas read remains a later change.
