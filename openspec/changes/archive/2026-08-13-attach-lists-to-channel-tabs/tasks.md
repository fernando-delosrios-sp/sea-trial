## 1. Spike — list channel attachment API

- [x] 1.1 Extend `slack-app/scripts/diagnose-list-create.ts` to accept `CHANNEL_ID`, call `slackLists.create` with and without `channel_id`, then `slackLists.access.set`, and print `conversations.info` tab types for the channel
- [x] 1.2 Run spike against dev tenant bot token; record supported attach mechanism in `design.md` Open Questions (resolve or confirm fallback)

## 2. Implementation — attach lists to channel

- [x] 2.1 Add `attachListToChannel` (or equivalent) in `slack-app/lib/lists.ts` implementing spike-validated attach path; keep `access.set` for write access
- [x] 2.2 Wire list provisioning through composition `channel_tab` default (true) in `channel-provisioner.ts` if attach is conditional
- [x] 2.3 Slugify select values in `seedListItems` via `toSlackListSelectValue` when column type is select
- [x] 2.4 If spike selects bookmarks fallback: add `bookmarks:write` to `manifest.ts` and create bookmark entries after list create

## 3. Tests

- [x] 3.1 Update `lists_test.ts` to assert attach helper is invoked after create (mock attach/tab API)
- [x] 3.2 Update `composition_test.ts` to assert list attach calls occur in provisioning order
- [x] 3.3 Add unit test for seed row select slugification (Deliverables seed status → `not_started`)

## 4. Documentation and Changelog

- [x] 4.1 Update `docs/smoke-test-checklist.md` — verify Deliverables and Incidents appear as channel tabs (or documented bookmarks fallback)
- [x] 4.2 Add CHANGELOG entry under Fixed for list channel attachment
