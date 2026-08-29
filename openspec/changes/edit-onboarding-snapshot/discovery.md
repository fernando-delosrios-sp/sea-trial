## Scope

**In:** After a successful onboarding submit, refresh the Onboarding Link Trigger snapshot to the post-submit `TesEventContext` (including `onboarding` form, `onboardingComplete`, derived components, `onboardingLinkUrl`, and object IDs) so a later Dashboard Complete onboarding click opens the same modal with those fields prefilled and another submit rewrites Dashboard from that latest snapshot. **Out:** Slack datastore; canvas-read recovery; a second edit-only workflow or modal file; rewriting the pinned index message on submit (Complete onboarding is replaced by Publish after first complete); deleting the Onboarding Link Trigger; auto-invoking the Requirements Agent on re-submit.

## Language

**Trigger context snapshot** (`promote` — Notes):
Compact JSON serialization of `TesEventContext` stored in Onboarding Link Trigger inputs (and, at seed, the pinned Complete onboarding button). After this change it is the latest successful-submit copy, not a seed-only freeze.
_Avoid_: Dashboard markdown dump, `<!-- tes-event-context -->` fenced block as the edit source

**Onboarding** (`promote` — Notes):
Same AE/SE modal for first complete and later edit; fields prefill from the snapshot (`onboarding` when present, else creation `accountName`).
_Avoid_: a separate “edit onboarding” shortcut or `/tes-onboard`

**Onboarding Link Trigger** (canonical, no rename):
Still the Dashboard href; submit MUST be able to update its baked `dashboard_canvas_content` (requires a stored trigger id on `TesEventContext` or an equivalent lookup already in scope of this change).

## Decisions

Context: Seed-time snapshot was a deliberate trade-off in `onboarding-trigger-context`. The Dashboard now keeps the Complete onboarding link after submit so AE/SE can edit opportunity details. Opening that link still loads the frozen seed snapshot, so Account/onboarding fields would not match the Dashboard.

1. **Same modal, same submit** — No second workflow. Open and submit stay `open_onboarding` / existing view submit. Re-submit applies the form onto the current snapshot (`applyOnboarding` / `processOnboardingSubmit`) and replaces Dashboard markdown.
2. **Refresh trigger snapshot on every successful submit** — `workflows.triggers.update` (already used after create to bake `onboardingLinkUrl`) writes compact JSON of the post-submit context into `dashboard_canvas_content`.
3. **Persist trigger id on `TesEventContext`** — Bake `onboardingTriggerId` at provision (same moment as `onboardingLinkUrl`) so submit does not list-and-guess triggers. Missing id on old channels fails like a missing snapshot (re-seed or repair).
4. **Prefill all onboarding fields from snapshot** — When `onboarding` is present, overlay `initial_value` / selected options from that form; otherwise keep today’s Account-only prefill.
5. **Announcement once** — First transition to `onboardingComplete` posts the agent-available channel message; later edits do not repeat it.
6. **Pinned index not the edit surface** — After complete, the pinned actions block is Publish situation report. Do not require `chat.update` of the pinned message in this change. Seed-time button snapshot may stay stale; Dashboard link is the edit CTA.
7. **No canvas read** — Unchanged. Snapshot remains the only readable copy.

## Open questions

None blocking. Deferred: refresh or hide leftover pinned Complete onboarding buttons on old messages; shrinking snapshot if trigger input size becomes a problem after full `onboarding` form text.

## Scenarios discussed

- First submit: Dashboard opportunity details written; `onboardingComplete` true; trigger snapshot updated; agent-available message posted; link stays ticked on the checklist.
- Second open from Dashboard link: modal prefills submitted Account, suite, stakeholders, etc. from snapshot `onboarding`.
- Second submit: Dashboard rewritten; snapshot updated again; no second agent-available announcement; agent gate stays open.
- Open with missing `onboardingTriggerId` after submit would not refresh — fail submit with repair/re-seed error rather than leave a stale trigger.
- Seed open (no `onboarding` yet): Account prefill only, unchanged.
- Pinned Complete onboarding (incomplete only): still uses seed snapshot until first submit; out of scope to rewrite that message after complete.
- Agent still blocked until first successful complete; re-submit does not call agent-service.
