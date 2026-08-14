## 1. Unique name helper

- [x] 1.1 Add `slack-app/lib/unique-resource-name.ts` with `formatSuffixedName`, `isNameCollisionError`, and `allocateUniqueName`
- [x] 1.2 Add `slack-app/tests/unique_resource_name_test.ts` covering base name, suffix sequence, collision error detection, and retry cap

## 2. Canvas and list integration

- [x] 2.1 Wire `createCanvas` to allocate unique titles via `allocateUniqueName`
- [x] 2.2 Wire `createListInChannel` (and bookmark attach) to use allocated list display names
- [x] 2.3 Extend `canvas_test.ts` and `lists_test.ts` with mocked collision-then-success scenarios

## 3. Delivery canvas integration

- [x] 3.1 Wire `delivery-canvas-orchestrator.ts` create path to allocate unique delivery canvas titles
- [x] 3.2 Add delivery orchestrator test for title collision suffix behavior

## 4. Verification

- [x] 4.1 Run `cd slack-app && deno task test` and confirm all tests pass

## 5. Documentation

- [x] 5.1 Update inline JSDoc on `createCanvas`, list create, and delivery orchestrator noting suffix disambiguation
- [x] 5.2 No README change required (internal provisioning behavior; no author-facing manifest change)

## 6. Changelog

- [x] 6.1 Create or update changelog entry for this change
- [x] 6.2 Confirm entry covers provisioning resilience on duplicate Slack resource names
