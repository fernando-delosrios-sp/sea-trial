# Brainstorm: Attach lists to TES channel tabs

## Background

TES Event Channel seeding via `provisionChannel` creates canvases and lists from
`slack-app/content/channels/tes-event.json`. Canvases appear as native channel
tabs; Deliverables and Incidents lists do not.

**Observed on `#proj-fsdfa-tes` (`C0BPY7THJ85`, 2026-08-13):**

- Create TES Event workflow completed successfully (seed ~20s, trace `Tr0BQ3Q99NTB`).
- `conversations.info` shows **3 tabs**, all `type: "canvas"` (Dashboard, Situation
  Report, Infrastructure file IDs `F0BPZT37GNA`, `F0BPZT3765U`, `F0BPZT4FA78`).
- **Zero** `type: "list"` tabs.
- Requirements canvas absent from tabs — expected (`channel_tab: false`).

**Current list provisioning (`slack-app/lib/lists.ts`):**

1. `slackLists.create({ channel_id, name, schema })`
2. `slackLists.access.set({ list_id, access_level: "write", channel_ids })`
3. `slackLists.items.create` for seed row

Official [`slackLists.create`](https://docs.slack.dev/reference/methods/slackLists.create/)
documents a **standalone** list — no `channel_id` argument. Canvases use
`canvases.create({ channel_id })` which reliably creates tabs.

## Actors & expectations

- **TES**: expects Deliverables and Incidents as first-class channel objects
  alongside canvases (smoke checklist: "Deliverables and Incidents lists exist").
- **AE/SE**: navigate via channel tabs or pinned index links.
- **Sea Trial app**: stores list IDs in Dashboard `TesEventContext` metadata;
  downstream flows (accept proposals, situation report) depend on list IDs, not tabs.

## Decision chain

### Q1: Is seed failing before lists are created?

**No.** Infrastructure canvas tab exists; it is provisioned *after* both lists in
manifest order. Seed completed without error on the sample channel.

### Q2: Are lists created but not tabbed?

**Yes — most likely.** Seed succeeds; `conversations.info.properties.tabs` has no
list entries. Lists may exist as standalone workspace objects with channel write
access via `access.set`.

### Q3: Does `channel_id` on `slackLists.create` attach tabs?

**Unverified / likely ineffective.** Code passes `channel_id` (restored in commit
`1e2020e` after `f966cf3` removed it in favor of `access.set` only). Sample channel
still has no list tabs. Official API docs omit `channel_id`. Hypotheses:

- Slack ignores unknown parameter.
- Deno Slack SDK hosted client strips undocumented fields.
- Parameter works only in preview / specific plan tier (needs spike).

### Q4: What approaches exist?

| # | Approach | Pros | Cons |
|---|----------|------|------|
| A | **Spike + fix `slackLists.create` tab attachment** | Native UX; matches canvases | API may not support; docs gap |
| B | **`bookmarks.add` with list deep links** | Documented API; visible in channel header | Not native list tabs; extra scope (`bookmarks:write`) |
| C | **Pinned-index-only navigation** | No API risk | Degrades UX vs spec intent; tabs still missing |
| D | **Composition `channel_tab` for lists + new attach helper** | Aligns manifest model with canvases | Needs working attach API |

### Q5: Chosen direction

**Primary: A** — spike the Slack Lists channel-tab attachment mechanism, implement
the supported approach in `createListInChannel`, add regression test that asserts
list tabs (or documented fallback).

**Fallback if A blocked:** B — add bookmarks for Deliverables/Incidents using
`buildObjectLinkUrl` pattern; document as interim until Slack exposes list tab API.

**Explicit non-goal:** Changing Requirements canvas tab behavior (`channel_tab: false`).

## Design trade-offs

- **[Trade-off]** Spike may require manual dev-tenant API calls with bot token
  → Accept: small time-boxed investigation before coding.
- **[Trade-off]** Bookmarks fallback is not spec-identical to tabs
  → Accept only if Slack confirms no programmatic list-tab API on Pro.
- **[Risk]** Existing channels (e.g. `C0BPY7THJ85`) won't retroactively gain tabs
  → Mitigation: document re-seed or one-off manual tab add; out of scope for auto-migration unless cheap.

## MVP boundaries

- In scope: new TES Event channels created after fix show Deliverables + Incidents
  as channel-attached objects (tabs or approved fallback).
- In scope: update `event-channel` spec scenarios for list tab visibility.
- Out of scope: agent-service changes, list schema changes, migrating old channels.

## Acceptance sketch

- GIVEN a newly seeded TES Event channel
- WHEN `conversations.info` is queried for the channel
- THEN `properties.tabs` SHALL include two entries with `type: "list"` (or approved
  fallback documented in design)
- AND pinned index links SHALL still resolve to the same list IDs in `TesEventContext`
