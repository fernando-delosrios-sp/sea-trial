# Implementation Plan: resource-name-collision-suffix

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** When Slack rejects a canvas or list create because the display name already exists, retry with `-1`, `-2`, … suffixes until success or cap.

**Architecture:** Shared `allocateUniqueName` helper in `lib/unique-resource-name.ts`; wired into `createCanvas`, list create, and delivery canvas orchestrator. Retry-on-error using centralized collision error codes.

**Tech Stack:** Deno, TypeScript, Slack Canvas/List APIs, existing test harness (`deno task test`)

**Canonical test command:** `cd slack-app && deno task test`

---

## Task 1 — Unique name helper (TDD)

**Files:** `slack-app/lib/unique-resource-name.ts`, `slack-app/tests/unique_resource_name_test.ts`

1. **RED:** Test `formatSuffixedName("Dashboard", 0)` → `"Dashboard"`, index 1 → `"Dashboard-1"`
2. **RED:** Test `isNameCollisionError("name_taken")` true; unknown errors false
3. **RED:** Test `allocateUniqueName` succeeds on second attempt when first throws collision
4. **RED:** Test cap throws after 100 attempts
5. **GREEN:** Implement helper
6. Run `deno task test` for new file

**Commit:** `feat(slack): add unique resource name allocator`

---

## Task 2 — Canvas create integration

**Files:** `slack-app/lib/canvas.ts`, `slack-app/tests/canvas_test.ts`

1. **RED:** Mock client returns `name_taken` on first `canvases.create`, succeeds on second with `Dashboard-1`
2. Refactor `createCanvas` to call `allocateUniqueName(params.title, …)`
3. **GREEN:** canvas tests pass including collision case
4. Run `deno task test`

**Commit:** `fix(canvas): disambiguate canvas titles on collision`

---

## Task 3 — List create integration

**Files:** `slack-app/lib/lists.ts`, `slack-app/tests/lists_test.ts`

1. **RED:** Mock `slackLists.create` collision then success; assert bookmark uses suffixed name
2. Wrap list name in `allocateUniqueName` inside `createListInChannel`
3. Pass allocated name to bookmark attach path
4. **GREEN:** list tests pass
5. Run `deno task test`

**Commit:** `fix(lists): disambiguate list names on collision`

---

## Task 4 — Delivery canvas integration

**Files:** `slack-app/lib/delivery-canvas-orchestrator.ts`, delivery orchestrator tests

1. **RED:** Test collision on `Delivery: TASK-42` → creates `Delivery: TASK-42-1`
2. Wire orchestrator create path through `allocateUniqueName`
3. **GREEN:** tests pass
4. Run full `deno task test`

**Commit:** `fix(deliverables): disambiguate delivery canvas titles on collision`

---

## Task 5 — Docs and changelog

**Files:** JSDoc on touched public functions; changelog via changelog-generator skill

1. Add brief JSDoc noting suffix policy on `createCanvas`, list create, delivery orchestrator
2. Run changelog-generator for this change
3. Final `deno task test`

**Commit:** `docs: document resource name suffix disambiguation`
