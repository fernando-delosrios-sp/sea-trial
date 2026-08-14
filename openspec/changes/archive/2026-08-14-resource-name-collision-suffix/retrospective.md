# Retrospective: resource-name-collision-suffix

**Change**: `resource-name-collision-suffix`
**Written**: 2026-08-14

---

## 1. Wins

- Central `allocateUniqueName` helper kept collision policy in one place across canvas, list, and delivery paths.
- Verify suggestions (provisionChannel integration + list tab collision) were quick to add and closed coverage gaps.
- Non-breaking for happy path; manifest step IDs and context mapping unchanged.

## 2. Misses

- Initial verify flagged missing end-to-end provisioner and tab-create collision tests — fixed before archive.

## 3. Plan deviations

- Delivery orchestrator disambiguation piggybacks on `createCanvas` rather than separate orchestrator logic — simpler and consistent.

## 4. Skill / workflow compliance

- TDD order followed: helper tests first, then integration tests.
- All 221 tests green at verify PASS.

## 5. Surprises

- List create return type change to `{ listId, displayName }` was needed for bookmark title alignment — small API surface change, limited callers.

## 6. Promote candidates

- Consider reusing `allocateUniqueName` in deploy-mate scaffold naming (noted as non-goal in design).
