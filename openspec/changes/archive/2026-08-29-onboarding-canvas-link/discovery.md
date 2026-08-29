## Scope

**In:** Point channel members to onboarding via a working Dashboard canvas link by creating a per-channel link trigger with baked-in `channel_id` and `dashboard_canvas_id`, using the API `share_url` (never a synthesized shortcut URL). Drop Workflows tab `bookmark`/`featured` flags from workflow steps; disable the shared global Complete Onboarding trigger; keep the pinned index button as fallback; backfill existing channels via a repair script. **Out:** Header bookmarks for onboarding, App Home, slash commands, deleting per-channel triggers after submit, resolving Dashboard from `channel_id` alone so one shared trigger could work from the shortcut menu.

## Language

**Onboarding** (`conflicts-with-canonical`):
AE/SE modal flow collecting customer context, SailPoint suite selection, and stakeholders; completion sets `onboardingComplete: true` and opens the Agent Gate.
_Avoid_: `/tes-onboard` as an entry point (not implemented; glossary Notes still cite it)

**Dashboard Canvas** (`promote` — Notes only):
The event hub canvas holding onboarding data, stakeholders, dates, status, and the TesEventContext metadata block.
_Avoid_: web dashboard, Render dashboard, Grafana dashboard

**Onboarding Link Trigger** (`promote`):
A channel-scoped Slack shortcut trigger named `Complete Onboarding ({channelId})` whose inputs bake `channel_id` and `dashboard_canvas_id` and whose `share_url` is the Dashboard canvas CTA.
_Avoid_: shared Complete Onboarding global shortcut, Workflows tab bookmark, fabricated `https://slack.com/shortcuts/{id}` without the secret path segment

**Pinned Index** (existing, no change):
The seeded, pinned channel message with navigation links and the Complete onboarding Block Kit button.

## Decisions

Context: Slack does not surface app slash commands in the Workflows folder. Workflows tab bookmark/featured association of a shared deploy-time trigger does not populate that tab for app workflows. User chose **Dashboard canvas link only** as the discoverable entry (not header bookmark, not pinned-only).

1. **Surface** — Dashboard `## Onboarding` markdown link (already in `dashboard.hbs.md`); pinned index button remains as fallback, not the primary discoverable CTA.
2. **Trigger identity** — Per-channel `workflows.triggers.create` with baked inputs, because canvas clicks do not reliably supply `TriggerContextData.Shortcut.channel_id` (documented locations: message, bookmark, button — not canvas) and the shared trigger never carries `dashboard_canvas_id`.
3. **URL** — Use the create-response `share_url` / `shortcut_url`; never synthesize `https://slack.com/shortcuts/{id}`. Stop setting `SLACK_ONBOARDING_TRIGGER_URL` from ID-only trigger list output.
4. **Naming** — `Complete Onboarding ({channelId})` so CI title matching and `cleanup-onboarding-triggers.ts` cannot collide with a shared title.
5. **Shared global trigger** — Disable `complete-onboarding` in `triggers.config.yaml`; it cannot resolve dashboard content.
6. **Manifest** — Onboarding workflow step is `{ id, kind, link }` only; reject `bookmark`/`featured` on workflow steps (list `bookmark` and canvas `tab` unchanged).
7. **Existing channels** — Repair script creates the per-channel trigger and rewrites the Dashboard onboarding link.

## Open questions

None blocking. Deferred (explicit, not this change): delete the per-channel trigger after onboarding completes; resolve Dashboard from `channel_id` so a single shared trigger could work from the shortcut menu.

## Scenarios discussed

- Fresh provision: Dashboard `## Onboarding` link opens modal with Account prefill.
- Canvas click without invoke-time channel context still works because inputs are baked.
- After submit, `showOnboardingLink` is false (`!onboardingComplete`) so the section disappears.
- Fabricated shortcut URL without secret segment must not be written to the canvas.
- Per-channel trigger title distinct from `Complete Onboarding` so deploy `findMatchingTrigger` cannot update it and cleanup-by-title cannot delete it.
- Shared global Complete Onboarding shortcut disabled; opening it today errors with “use the pinned index button.”
- Workflows tab is not a required entry; `bookmark`/`featured` on workflow steps are invalid.
- Backfill: existing channel with Dashboard ID gets a new trigger URL written into the canvas.
- Pinned index Complete onboarding button still opens the modal (unchanged Block Kit action).
- Agent gate copy still MAY mention the pinned button; Dashboard link is an additional path, not a replacement of that message until copy is updated in docs.
