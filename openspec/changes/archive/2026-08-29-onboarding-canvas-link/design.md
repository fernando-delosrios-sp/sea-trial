## Context

Sea Trial's slack-app (Deno Slack SDK) seeds TES Event Channels with a Dashboard canvas (TesEventContext store), a pinned index message, and an onboarding workflow (`open_onboarding_workflow`). Agent-service is unchanged. Slack does not place app slash commands in the Workflows folder. Associating a shared deploy-time link trigger via permissions or `workflows.featured.add` does not populate the channel Workflows tab for this app. User selected Dashboard canvas link as the sole new discoverable surface (not a header bookmark).

Current code already renders `## Onboarding` with `showOnboardingLink` in `dashboard.hbs.md` and `finalizeDashboardCanvas`. Failures: (1) share URL is synthesized from trigger ID without the secret segment; (2) shared trigger inputs omit `dashboard_canvas_id` and cannot rely on canvas-click `channel_id`. Runtime `createChannelOnboardingTrigger` already bakes both IDs and returns the API share URL — it is currently gated on `bookmark: true`.

## Goals / Non-Goals

**Goals:**

- Channel members can complete onboarding from a working Dashboard canvas link
- Per-channel trigger carries baked `channel_id` and `dashboard_canvas_id`
- Canvas stores a real `share_url` / `shortcut_url`, never an ID-only shortcut URL
- Pinned index Complete onboarding button still works
- Existing channels can be repaired without re-provisioning the whole channel
- Composition manifest no longer claims Workflows tab surfacing that Slack will not honour

**Non-Goals:**

- App slash commands or App Home
- Channel header bookmark for onboarding
- Workflows tab bookmark/featured as a required UX
- Deleting the per-channel trigger after onboarding submit
- Resolving Dashboard markdown from `channel_id` alone so one shared trigger works from the shortcut menu
- agent-service or shared type shape changes (unless TesEventContext already holds what we need)

## Decisions

### D1: Dashboard canvas link is the discoverable CTA
- **Choice**: Seed and backfill the Dashboard Onboarding tasks checklist link; keep the pinned index Block Kit button as fallback
- **Reason**: Slack documents including a link trigger in a channel canvas; user rejected header bookmark and pinned-only
- **Considered alternatives**: Header bookmark (passes channel context per docs but user declined); pinned-only (already works but is easy to miss); Workflows tab (platform does not surface this app workflow there)

### D2: Per-channel trigger with baked inputs
- **Choice**: On workflow step `open_onboarding_workflow`, always call `workflows.triggers.create` with `channel_id` and `dashboard_canvas_id` literals, grant named-entity channel access, return `share_url`
- **Reason**: Documented shortcut `location` values are message, bookmark, and button — not canvas. Shared trigger cannot pass dashboard ID
- **Considered alternatives**: Shared trigger + `TriggerContextData.Shortcut.channel_id` (fails from canvas and lacks dashboard ID); resolve dashboard from channel_id at open time (deferred)

### D3: Distinct trigger title
- **Choice**: Name `Complete Onboarding ({channelId})` using the existing `buildProvisionTitle` channel-scope convention
- **Reason**: `findMatchingTrigger` and `cleanup-onboarding-triggers.ts` match title `Complete Onboarding`
- **Considered alternatives**: Keep shared title (CI could update or delete channel triggers)

### D4: Never fabricate shortcut URLs
- **Choice**: Parse `share_url` or `shortcut_url` from create; accept `trigger.id` or `trigger.trigger_id`. `resolveWorkflowTriggerShareUrl` returns env override or undefined — no `https://slack.com/shortcuts/{id}` synthesis. Deploy does not set `SLACK_ONBOARDING_TRIGGER_URL` from ID-only list output
- **Reason**: Real URLs include a secret path segment
- **Considered alternatives**: Keep synthesized URL as fallback to pinned message (still a dead CTA if preferred over pinned deep link)

### D5: Disable shared complete-onboarding trigger
- **Choice**: `triggers.config.yaml` `complete-onboarding` `enabled: false`; `tes-onboard` stays disabled
- **Reason**: Global shortcut cannot supply `dashboard_canvas_id`; `open_onboarding` already errors directing users to the pinned button
- **Considered alternatives**: Keep enabled for shortcut-menu discoverability (broken modal)

### D6: Drop workflow bookmark/featured flags
- **Choice**: Manifest workflow steps are `{ id, kind, link }` only; resolver and JSON Schema reject `bookmark` and `featured` on workflow kind. List `bookmark` and canvas `tab` unchanged
- **Reason**: Flags cannot be honoured; leaving them invites another Workflows-tab attempt
- **Considered alternatives**: Ignore flags at runtime but keep them in schema (lying contract)

### D7: Backfill via repair script
- **Choice**: Repurpose `repair-workflow-tab.ts` to create the per-channel trigger and replace Dashboard content so the onboarding link uses the new URL
- **Reason**: Existing channels already have canvases; full re-seed is destructive
- **Considered alternatives**: Manual Slack UI; only fix new channels

## Risks / Trade-offs

[Risk] Slack `workflows.triggers.create` response shape uses `trigger_id` vs `id` inconsistently on some tenants -> Mitigation: accept both; fail provision if share URL missing
[Risk] One trigger per channel accumulates over time -> Mitigation: accepted for MVP; deletion after submit is an explicit non-goal
[Risk] Canvas markdown link click still fails to unfurl as a workflow button on some clients -> Mitigation: pinned index button remains; smoke-test both paths
[Risk] Repair script needs bot token plus CHANNEL_ID and Dashboard canvas ID -> Mitigation: document env vars; do not invent IDs
[Trade-off] Per-channel triggers vs one shared trigger -> Reason: canvas context gap; shared trigger is a dead CTA
[Trade-off] Duplicate shortcut entries could reappear if titles collide -> Reason: distinct titles prevent CI/cleanup collisions; workspace palette may still list channel-scoped shortcuts depending on Slack UI
[Risk] Dev tenant API limits on trigger create -> Mitigation: fail seeding with a clear error rather than writing a dead link

## Migration Plan

1. Deploy slack-app with per-channel create path, composition without workflow flags, `complete-onboarding` disabled.
2. New TES Event Channels get a working Dashboard link at seed.
3. For existing incomplete-onboarding channels, run the repair script with `CHANNEL_ID` and Dashboard canvas ID.
4. Optional: run cleanup for leftover triggers titled exactly `Complete Onboarding` (shared), not `Complete Onboarding (C…)`.
5. Rollback: re-enable shared trigger and restore workflow flags does not restore Workflows tab; rollback is previous app version plus accepting the dead canvas URL again.

Acceptance: `deno task test` in slack-app; smoke: Dashboard link opens modal with Account prefill; submit hides the section; pinned button still works.

## Open Questions

None. Deferred: post-submit trigger deletion; Dashboard lookup from `channel_id` for a future shared trigger.
