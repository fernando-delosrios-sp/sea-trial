## Context

Onboarding open/submit already uses a compact `TesEventContext` snapshot in Onboarding Link Trigger inputs (`dashboard_canvas_content`) and must not read Dashboard canvas markdown. After submit, the Dashboard checklist keeps the Complete onboarding share URL for later edits. That href still launches the same trigger, whose snapshot is seed-time unless submit updates it. Slack-app remains the only Slack adapter; agent-service is unchanged. State stays Slack-native.

This change assumes the Dashboard link remains after complete (`onboardingLinkUrl` on context). It does not re-open the canvas-link vs Workflows-tab fork.

## Goals / Non-Goals

**Goals:**

- After successful submit, the Onboarding Link Trigger snapshot SHALL equal the post-submit `TesEventContext` (compact JSON)
- A later Dashboard Complete onboarding open SHALL prefill all onboarding fields from snapshot `onboarding` when present
- Re-submit SHALL rewrite Dashboard from that snapshot + new form without canvas read
- First complete still announces the agent; later edits SHALL NOT repeat that message
- Missing trigger id SHALL fail submit clearly (re-seed or repair), not silently leave a stale trigger

**Non-Goals:**

- Slack datastore or canvas-read fallback
- Second workflow, modal JSON file, or “Edit onboarding” trigger title
- Updating the pinned index message on submit
- Auto-invoking the Requirements Agent on re-submit
- Migrating channels that lack `onboardingTriggerId` without repair/re-seed

## Decisions

### D1: Same open/submit path for first complete and later edit

- **Choice**: Keep `open_onboarding` workflow, existing modal JSON, and existing view submit. `onboardingComplete` stays true after first success; further submits overwrite Dashboard opportunity details and derived components.
- **Reason**: The kept Dashboard link already points at this trigger; a second workflow would not get a canvas click context either.
- **Considered alternatives**: Separate edit modal (duplicate Block Kit); disable submit after complete (defeats the kept link).

### D2: Persist `onboardingTriggerId` on `TesEventContext`

- **Choice**: After `workflows.triggers.create`, store the trigger id on context and include it in the compact snapshot (same update pass that bakes `onboardingLinkUrl`). Submit calls `workflows.triggers.update` with that id.
- **Reason**: Submit must not search the workspace by title. Create already returns the id.
- **Considered alternatives**: Lookup by `Complete Onboarding ({channelId})` (fragile vs CI/cleanup naming); omit id and fail all edits (unusable CTA).

### D3: Refresh snapshot on every successful Dashboard rewrite

- **Choice**: After `applyOnboarding` / `replaceCanvasContent` succeeds, update trigger input `dashboard_canvas_content` to `JSON.stringify` of the new context. If update fails, fail the submit with a visible error (Dashboard may already be written — prefer update-before-replace only if tests can keep them atomic; otherwise update immediately after successful replace and document that a failed update needs repair).
- **Reason**: Next open must match what humans see on the Dashboard.
- **Considered alternatives**: Update trigger only, skip Dashboard (wrong); Dashboard only (current bug).

**Ordering (apply):** Attempt trigger snapshot update with post-submit context **before** or **together with** canvas replace. Preferred: compute new context → update trigger → replace canvas → announcement if first complete. If trigger update fails, do not replace canvas (user can retry submit). If canvas replace fails after trigger update, retry/repair may be needed; log clearly.

### D4: Prefill from `onboarding` when present

- **Choice**: Modal compiler overlays `initial_value` / select initial options from `TesEventContext.onboarding` for every onboarding block id. If `onboarding` is absent, keep Account-only prefill from `accountName`.
- **Reason**: First open has no form yet; edit open must restore the last submit.
- **Considered alternatives**: Prefill Account only (insufficient for edit).

### D5: Announce agent availability once

- **Choice**: Post the agent-available channel message only when the snapshot being submitted had `onboardingComplete === false` and the result is true.
- **Reason**: Edits should not spam the channel.
- **Considered alternatives**: Always announce (noisy); never announce (regresses first complete).

### D6: Do not rewrite pinned index on submit

- **Choice**: Leave pinned message as provisioned. After complete it shows Publish, not Complete onboarding.
- **Reason**: Edit CTA is the Dashboard link; button `value` 2000-char cap is hostile to a full `onboarding` form snapshot.
- **Considered alternatives**: `chat.update` pinned blocks with a larger snapshot (fails the cap) or drop snapshot from the button (reintroduces canvas read).

## Risks / Trade-offs

- [Risk] `workflows.triggers.update` payload too large once `onboarding` text is included → Mitigation: compact JSON; fail submit with a clear error rather than truncate; keep form fields as today (no new blobs)
- [Risk] Trigger update succeeds and canvas replace fails → Mitigation: prefer trigger update after canvas success **or** trigger-first with retry; smoke: if Dashboard lags trigger, one more submit; document repair
- [Risk] Channels provisioned before `onboardingTriggerId` cannot refresh → Mitigation: same repair script / re-seed as missing snapshot
- [Trade-off] Pinned Complete onboarding snapshot stays seed-time while incomplete → Reason: first submit is the freeze point we care about; incomplete pinned button is still correct for first open
- [Trade-off] No separate Edit chrome → Reason: one modal, one trigger name already on the canvas

## Migration Plan

1. Add `onboardingTriggerId` to shared type; bake on provision/repair trigger update; full-field modal prefill; submit updates trigger then Dashboard; gate announcement.
2. `deno task test` in `slack-app/` (agent-service untouched).
3. Deploy slack-app; new channel: complete onboarding, click Dashboard link, confirm prefill, edit and submit, confirm Dashboard and no second announcement.
4. Old channels: re-seed or repair with snapshot that includes trigger id. Rollback: previous slack-app; triggers keep last baked snapshot.

## Open Questions

None blocking. Watch trigger input size if onboarding notes grow large.
