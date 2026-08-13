## Why

TES Event Channel seeding completes successfully but Deliverables and Incidents lists never appear as channel tabs—only Dashboard, Situation Report, and Infrastructure canvases do. Inspection of `#proj-fsdfa-tes` (`C0BPY7THJ85`) shows three canvas tabs and zero list tabs in `conversations.info`, despite a successful seed run. TES users expect lists alongside canvases in the channel header; pinned-index links alone are insufficient for the intended Slack-native workflow. This gap blocks smoke-test acceptance and undermines the composition manifest promise that lists are first-class channel objects.

## What Changes

**List channel attachment**
- From: `createListInChannel` calls `slackLists.create` with undocumented `channel_id` plus `slackLists.access.set`; lists are not reflected in channel tabs.
- To: Lists are attached to the TES Event Channel using the Slack-supported mechanism (spike-validated); channel tab metadata includes Deliverables and Incidents.
- Reason: `access.set` grants permissions only; canvas tab attachment uses a different code path that lists do not share today.
- Impact: Non-breaking for list IDs in `TesEventContext`; visible UX improvement for new channels.

**Verification & diagnostics**
- From: No automated assertion that lists appear on the channel.
- To: Tests and/or diagnose script assert tab attachment (or documented fallback); smoke checklist updated.
- Reason: Regression shipped when `channel_id` was removed then partially restored without tab verification.
- Impact: Non-breaking; test and tooling only.

**Requirements canvas**
- No change — remains standalone (`channel_tab: false`).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `event-channel`: Channel object seeding SHALL require Deliverables and Incidents lists to be visible as channel-attached objects (native list tabs or design-approved fallback).

## Impact

- **Code:** `slack-app/lib/lists.ts`, `slack-app/lib/content/channel-provisioner.ts` (if composition-driven tab flags needed), `slack-app/scripts/diagnose-list-create.ts`, tests (`lists_test.ts`, `composition_test.ts`).
- **Manifest:** Possible new bot scope if bookmarks fallback (`bookmarks:write`); spike determines.
- **Docs:** `docs/smoke-test-checklist.md`, `CHANGELOG.md`.
- **Systems:** Slack Lists API only; no agent-service or shared-types changes.
