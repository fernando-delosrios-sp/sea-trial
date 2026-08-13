## Context

Sea Trial seeds TES Event Channels via the `tes-event` composition manifest and
`provisionChannel`. Canvases attach as channel tabs through `canvases.create`
with `channel_id`. Lists are created in `createListInChannel` (`lists.ts`) but
sample channel `C0BPY7THJ85` shows no list tabs in `conversations.info` despite
successful seeding.

Slack's documented `slackLists.create` API creates standalone lists. The codebase
also calls `slackLists.access.set` for channel write access. Neither path is
reflected as list tabs in channel metadata today.

## Goals / Non-Goals

**Goals:**

- Deliverables and Incidents lists appear as channel-attached objects on every
  newly seeded TES Event channel.
- Preserve existing behavior: list IDs in `TesEventContext`, seed rows, pinned
  index navigation links.
- Add automated verification so list tab regression cannot ship silently.

**Non-Goals:**

- Retroactive migration of channels seeded before the fix (e.g. `C0BPY7THJ85`).
- Changing Requirements canvas tab policy (`channel_tab: false`).
- List schema, field-change behavior, or agent-service changes.
- Replacing pinned index navigation.

## Decisions

### D1: Spike before implementation

- **Choice:** Time-boxed spike (≤ half day) using bot token against dev tenant:
  create list with candidate attach parameters; read `conversations.info` for tab
  entries.
- **Reason:** Official docs omit list channel-tab attachment; empirical evidence
  required before coding.
- **Considered alternatives:** Implement `channel_id` blindly (rejected — already
  present, still broken); skip spike and use bookmarks (rejected — may miss native
  API).

### D2: Primary attach mechanism (post-spike)

- **Choice:** Implement whatever the spike validates:
  1. If `channel_id` on `slackLists.create` works via raw HTTP but not SDK → fix
     client call shape or use `slack api` equivalent.
  2. If Slack exposes a dedicated attach/tab method → wrap in `attachListToChannel`.
  3. If no programmatic tab API → **fallback D3**.
- **Reason:** Native list tabs match canvas UX and smoke-test intent.
- **Considered alternatives:** Bookmarks-only (deferred to fallback).

### D3: Bookmarks fallback (conditional)

- **Choice:** If spike confirms no list-tab API on Slack Pro, add
  `bookmarks.add` entries for Deliverables and Incidents using
  `buildObjectLinkUrl(teamId, "list", listId)` URLs; document in spec as
  approved fallback.
- **Reason:** Keeps lists discoverable in channel header without blocking MVP.
- **Considered alternatives:** Pinned-index-only (rejected — fails user expectation
  for parity with canvases).

### D4: Composition `channel_tab` for lists

- **Choice:** Extend list provisioning to respect `channel_tab` from composition
  entries (default `true`), mirroring canvas behavior in `channel-provisioner.ts`.
- **Reason:** Keeps `tes-event.json` the single blueprint; Requirements list N/A
  (no list with `channel_tab: false` today).
- **Considered alternatives:** Hard-code attach in `createListInChannel` only
  (rejected — diverges from composition model).

### D5: Seed row select values (minor hardening)

- **Choice:** When touching `seedListItems`, slugify select column values via
  `toSlackListSelectValue` for consistency with `accept_proposals`.
- **Reason:** Prevents latent `items.create` failures; not root cause of missing
  tabs but low-cost while editing `lists.ts`.
- **Considered alternatives:** Defer (acceptable if spike-only change is minimal).

## Risks / Trade-offs

- [Risk] Slack has no public list-tab API → Mitigation: bookmarks fallback (D3);
  update spec language to "channel-attached" not strictly "tab type list".
- [Risk] Deno hosted runtime strips undocumented API fields → Mitigation: spike
  on hosted deploy, not just local `diagnose-list-create.ts`.
- [Risk] `bookmarks:write` scope requires redeploy → Mitigation: add to manifest
  only if fallback path taken.
- [Trade-off] Existing channels lack retroactive tabs → Reason: manual re-create
  or accept pinned-index navigation for legacy channels.

## Migration Plan

1. Spike on dev tenant with Sea Trial bot token.
2. Implement attach fix + tests locally (`deno task test` in `slack-app/`).
3. Deploy slack-app via existing CI pipeline.
4. Smoke test: Create TES Event → confirm 5 channel objects visible (3 canvas tabs
   + 2 list tabs or bookmark fallback) on a **new** channel.
5. Rollback: revert deploy; lists remain standalone (current behavior).

## Open Questions

1. ~~Does Slack Pro expose an undocumented `channel_id` on `slackLists.create` that
   the hosted SDK client drops?~~ **Resolved (2026-08-13):** No. Sample channel
   `C0BPY7THJ85` shows zero `type: "list"` tabs after seed despite
   `channel_id` + `access.set`. Official `slackLists.create` docs omit
   `channel_id`; Node SDK types exclude it. Raw HTTP probe with `channel_id`
   does not create list tabs.
2. ~~Is there a `conversations.*.list` preview method not yet in public docs?~~
   **Resolved:** No public list-tab attach API found. Implementation uses
   **bookmarks fallback (D3)** via `bookmarks.add` with list deep links.
3. Should bookmarks fallback satisfy spec long-term or only until Slack documents
   list tabs? **Decision:** Bookmarks satisfy the spec's approved fallback; revisit
   when Slack documents native list channel tabs.
