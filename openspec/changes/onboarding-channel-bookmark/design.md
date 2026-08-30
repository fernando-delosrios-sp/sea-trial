## Context

Onboarding used a per-channel shortcut, a Dashboard share URL, and a pinned button. Slack lists every trigger a person may run in every channel they open, so per-channel names clutter `#oppties`. On 2026-08-30 the pinned button was shown not to open the modal: block actions bind to a function invocation, and `seed_channel_objects` completes before anyone clicks.

Canvas APIs still cannot return Dashboard markdown. A canvas click still cannot supply `channel_id`. Those constraints are unchanged.

## Blocking finding (2026-08-30) — pinned button is not an opener

A seeded channel rendered Complete onboarding on the pinned index. The click showed a warning triangle and produced **no** activity log line. Slack never dispatched it.

Block action handlers attach to a function invocation. When that execution completes, they are no longer invocable. The handler lives on `OpenOnboardingFunction` (started from a shortcut). Seeding posts the message and finishes.

Direct bug fixes (Block Kit string `value`, fail seed without `ts`, full `workflows.triggers.update` payload) shipped separately. They are not this change.

## Goals / Non-Goals

**Goals**
- One workspace shortcut `Complete onboarding` using the channel in view
- Run access: members of TES Event Channels (`named_entities` + each seeded channel ID)
- Store row per channel; miss or non-TES channel fails clearly
- Prefill after complete via the same shortcut
- Slack Datastore only — no Postgres/Redis

**Non-Goals**
- Hiding `Complete onboarding` from `#oppties` for TES Event Channel members
- Interactive Complete/Edit buttons on the pinned index
- Workflows tab, App Home, slash commands
- Automatic repair of every pre-change channel

## Decisions

### D1: Global `Complete onboarding` shortcut is the opener
- **Choice**: Enable `triggers/complete_onboarding.ts` at deploy. Inputs: `interactivity` and `TriggerContextData.Shortcut.channel_id`
- **Reason**: Starts a live `OpenOnboardingFunction` execution. One menu name instead of N
- **Considered alternatives**: Pinned button (disproved); long-lived seed execution (workflow never completes); keep per-channel triggers (menu grows)

### D2: TES Event Context Store keyed by channel ID
- **Choice**: Slack Datastore; primary key = channel ID; attribute = compact `TesEventContext` JSON. Seed `put`, open `get`, submit `put`
- **Reason**: Only Slack-native store the shortcut can read without canvas download or a 2000-character button
- **Considered alternatives**: Trigger inputs (requires per-channel trigger); pinned button value (not an opener)

### D3: Grant the global shortcut to each TES Event Channel at seed
- **Choice**: `permissions.add` with `channel_ids: [channelId]` after the store `put`. People in no granted channel cannot run it
- **Reason**: Matches “only TES Event Channel members”. Slack still lists the shortcut everywhere those people go
- **Considered alternatives**: Workspace `everyone` (too wide); collaborators only (AE/SE in the channel cannot onboard)

### D4: Drop trigger identity fields; store is source of truth
- **Choice**: Remove `onboardingTriggerId` and `onboardingLinkUrl` from `TesEventContext`
- **Reason**: No per-channel trigger to refresh
- **Considered alternatives**: Keep dead optionals (stale reads)

### D5: Remove `workflow` composition kind
- **Choice**: Schema and resolver reject `kind: workflow`; drop the step from `tes-event.json`; delete per-channel trigger helpers
- **Reason**: That kind existed only to create Onboarding Link Triggers
- **Considered alternatives**: Keep the kind unused (preserves the wrong assumption)

### D6: Pinned index and Dashboard are not openers
- **Choice**: Pinned index has no Complete/Edit onboarding button. Dashboard onboarding task tells the user to run `Complete onboarding`; no `https://slack.com/shortcuts/` href
- **Reason**: Those surfaces cannot start a function. A dead button is worse than instruction
- **Considered alternatives**: Bookmark to pinned message as “entry” (extra click, still no modal)

## Risks / Trade-offs

- **`#oppties` still lists `Complete onboarding` for TES members** — accepted; one name, not N
- **Datastore orphans** — archive/delete of a channel does not remove the row unless a script does
- **Grant drift** — seed must add the channel; repair must add it for old channels
- **Empty `named_entities`** — Slack rejects empty grants; deploy may leave collaborators until the first channel is added
- **Existing channels** — per-channel triggers deleted; unrepaired channels cannot open onboarding until repair

## Migration Plan

1. Ship datastore, global shortcut, seed `put`+grant, open/submit via store
2. Cleanup per-channel `Complete Onboarding ({channelId})` triggers
3. Repair chosen existing channels: `put` + grant
4. Leave unrepaired channels until an operator runs repair

## Open Questions

1. Bookmark upkeep if the pinned index is re-posted — deferred (bookmark is not the opener)

Resolved: pinned button as opener — **no**. Opener — **D1–D3**.
