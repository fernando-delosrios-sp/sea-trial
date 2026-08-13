# Attach Lists to Channel Tabs — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development
> to implement this plan task-by-task.

**Goal:** Ensure Deliverables and Incidents lists are visible as channel-attached
objects on every newly seeded TES Event channel.

**Architecture:** Spike validates Slack's supported list-to-channel attach
mechanism, then implement in `createListInChannel` with tests mirroring canvas
tab attachment. Bookmarks fallback only if spike proves no native tab API.

**Tech Stack:** Deno Slack SDK (hosted), Slack Lists API, TypeScript, existing
composition manifest (`tes-event.json`).

---

## Task 1: Spike — diagnose list tab attachment

**Files:**
- Modify: `slack-app/scripts/diagnose-list-create.ts`

- [ ] **Step 1:** Add optional `CHANNEL_ID` env var; after each successful
  `slackLists.create`, call `conversations.info` and log `properties.tabs` types
- [ ] **Step 2:** Run with dev bot token against a throwaway channel:
  `SLACK_BOT_TOKEN=... CHANNEL_ID=C... deno run --allow-read --allow-env --allow-net slack-app/scripts/diagnose-list-create.ts`
- [ ] **Step 3:** Record result in `design.md` — native `channel_id`, other param,
  or bookmarks-only fallback

## Task 2: Attach helper (TDD)

**Files:**
- Modify: `slack-app/lib/lists.ts`
- Test: `slack-app/tests/lists_test.ts`

- [ ] **Step 1:** Write failing test — `createDeliverablesList` invokes attach
  helper after create + access.set (mock records attach call)
- [ ] **Step 2:** Run `cd slack-app && deno test tests/lists_test.ts` — verify FAIL
- [ ] **Step 3:** Implement `attachListToChannel` using spike-validated API;
  call from `createListInChannel`
- [ ] **Step 4:** Run `deno test tests/lists_test.ts` — verify PASS

## Task 3: Seed select slugification

**Files:**
- Modify: `slack-app/lib/lists.ts`
- Test: `slack-app/tests/lists_test.ts` (or new focused test)

- [ ] **Step 1:** Write failing test — seed `items.create` receives
  `status: "not_started"` for Deliverables placeholder row
- [ ] **Step 2:** Run test — verify FAIL
- [ ] **Step 3:** Map select columns through `toSlackListSelectValue` in
  `seedListItems`
- [ ] **Step 4:** Run test — verify PASS

## Task 4: Composition provisioning integration

**Files:**
- Modify: `slack-app/tests/composition_test.ts`
- Modify: `slack-app/lib/content/channel-provisioner.ts` (if `channel_tab` wiring)

- [ ] **Step 1:** Extend composition test mock client with attach spy; assert two
  list attach calls after create order
- [ ] **Step 2:** Run `deno test tests/composition_test.ts` — verify FAIL then PASS
  after wiring
- [ ] **Step 3:** Run full suite: `cd slack-app && deno task test`

## Task 5: Bookmarks fallback (conditional — skip if spike confirms native tabs)

**Files:**
- Modify: `slack-app/manifest.ts`
- Modify: `slack-app/lib/lists.ts`

- [ ] **Step 1:** Add `bookmarks:write` to bot scopes if needed
- [ ] **Step 2:** Implement bookmark creation with list deep links after list create
- [ ] **Step 3:** Test bookmark path in `lists_test.ts`

## Task 6: Documentation

**Files:**
- Modify: `docs/smoke-test-checklist.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1:** Update smoke checklist object seeding bullets for list tabs
- [ ] **Step 2:** Add CHANGELOG Fixed entry
- [ ] **Step 3:** Manual smoke on dev tenant — new Create TES Event channel shows
  list tabs (or bookmarks per design)

---

## Verification commands

```bash
cd slack-app && deno task test
```

Manual: Create TES Event → inspect channel tabs → confirm Deliverables + Incidents
visible alongside Dashboard, Situation Report, Infrastructure.
