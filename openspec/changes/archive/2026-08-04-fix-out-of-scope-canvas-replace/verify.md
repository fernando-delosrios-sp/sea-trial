# Verification Report

> Generated inside apply step 2 (verify-fix loop). Apply must not report done until Overall Decision is ✅ PASS — fix blocking items autonomously; do not hand verify failures to the user. Standalone `/opsx:verify` is for re-runs after interruption.

**Change**: `fix-out-of-scope-canvas-replace`
**Verified at**: `2026-08-04 19:26`
**Verifier**: Cursor agent (apply)

---

## 1. Structural Validation (`openspec validate --all --json`)

- [x] All items have `"valid": true`

**Result**:

```text
summary: 8/8 passed (2 changes, 6 specs)
fix-out-of-scope-canvas-replace: valid
```

If there are failed items, list their id + issues:

| Item | Type | Issues |
|---|---|---|
| — | — | — |

---

## 2. Task Completion Sanity Check (`tasks.md`)

- [x] All `- [ ]` are `- [x]` (including Documentation and Changelog sections)

**Uncompleted tasks** (any row here = FAIL, return to apply):

| Task | Reason |
|---|---|
| — | — |

---

## 3. Spec Scenario Test Coverage

For each `#### Scenario:` in this change's delta specs, map to an automated test that exercises the assertions:

| Scenario (spec / requirement) | Test (file / name) | Covers GIVEN/WHEN/THEN? |
|---|---|---|
| Out of Scope section updated on subsequent run | `agent-rules.test.ts` / replaces Out of Scope section instead of duplicating header | ✓ |
| Out of Scope section created on first run | `agent-rules.test.ts` / appends Out of Scope section on first run | ✓ |

**Coverage gaps** (any ✗ missing = FAIL, return to apply to add tests):

- none

---

## 4. Design / Specs Coherence

Spot-check that design.md decisions are reflected in specs/ requirements:

| Design decision | Corresponding requirement / scenario | Gap? |
|---|---|---|
| Header replace matches Documents processed pattern | Out of Scope section updated on subsequent run | — |
| Skip update when outOfScope empty | (implicit — same guard as other sections) | — |

**Material drift** (decision with no spec counterpart = FAIL):

- none

---

## 5. Deferred Manual Dogfood vs Automated Test Equivalence

(plan.md has no `[~]` deferred rows — section N/A)

---

## Overall Decision

- [x] ✅ PASS — Can proceed to retrospective and archive
- [ ] ❌ FAIL — Return to apply; fix issues and re-run verify

**Next Step**:

Archive with `/opsx:archive` when ready.
