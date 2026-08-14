# Verification Report

**Change**: `workflow-channel-surfacing`
**Verified at**: 2026-08-14
**Verifier**: opsx-verify (agent)

---

## Summary

| Dimension    | Status |
|--------------|--------|
| Completeness | 18/18 tasks, 8 requirements |
| Correctness  | 8/8 reqs covered; 7/8 scenarios automated |
| Coherence    | Design followed; 2 warnings |

---

## 1. Structural Validation (`openspec validate --all --json`)

- [x] All items have `"valid": true` (INFO-only length notices on unrelated specs)

**Evidence**: `openspec validate --all --json` exit 0; all `"valid": true`.

---

## 2. Task Completion Sanity Check (`tasks.md`)

- [x] All 18 checkboxes complete

**Evidence**: `openspec instructions apply --change workflow-channel-surfacing --json` → `progress.complete: 18`, `state: all_done`.

---

## 3. Spec Scenario Test Coverage

| Scenario | Test (file / name) | Status |
|---|---|---|
| TES event manifest loads and validates | `composition_test.ts` — tes-event composition manifest loads | ✅ |
| Kind-scoped surfacing flags validate | `composition_test.ts` — canvas/list/workflow flag rejection | ✅ |
| Workflow link validates | `composition_test.ts` — accepts bookmark/featured; rejects ref | ✅ |
| Workflow bookmark opt-in | `onboarding_channel_trigger_test.ts`, `composition_test.ts` provisioner | ✅ |
| Workflow featured opt-in | `onboarding_channel_trigger_test.ts` — featured.add | ✅ |
| Shared trigger resolved | `onboarding_channel_trigger_test.ts` — env trigger ID | ✅ |
| Unknown workflow link fails | `onboarding_channel_trigger_test.ts` — throws | ✅ |
| Objects seeded with workflow bookmark | `composition_test.ts` — provisioner order + two-channel reuse | ✅ |
| Open onboarding from Workflows tab | `open_onboarding` workflow + manual smoke | ⚠️ manual |
| Open onboarding form (pinned index) | `onboarding_test.ts`, `open_onboarding` handlers | ✅ |
| Submit onboarding | `onboarding_test.ts`, `onboarding_view_submit_test.ts` | ✅ |

**Automated test run**: `cd slack-app && deno task test` → 234 passed, 0 failed.

---

## 4. Design / Specs Coherence

| Design decision | Requirement | Gap? |
|---|---|---|
| D1 Separate workflow bookmark | Workflow bookmark opt-in | ✅ `composition-resolver.ts`, schema |
| D2 Shared trigger | Shared workflow trigger registry | ✅ `workflow-trigger-registry.ts`, no per-channel create |
| D3 Channel permissions | Workflow bookmark opt-in | ✅ `permissions.set` + `permissions.add` in `onboarding-channel-trigger.ts` |
| D4 Workflows tab bookmark via permissions | Workflow bookmark opt-in | ✅ same path; manual UI confirm deferred |
| D5 Featured API | Workflow featured opt-in | ✅ `workflows.featured.add` when flag set |
| D6 Trigger ID resolution | Shared workflow trigger registry | ⚠️ env wired; list lookup API exists but not called from provisioner |

---

## 5. Deferred Manual Dogfood

| Check | Equivalent automated test? | Gap |
|---|---|---|
| Onboarding in Workflows tab bookmarked list | Invoke path covered by `open_onboarding` + trigger association tests | Manual UI confirm on dev tenant after deploy |
| `workflows.featured.add` bot token on Slack Pro | Unit test mocks featured.add | No live tenant spike (no `featured: true` step in tes-event) |

---

## Issues by Priority

### CRITICAL

_(none)_

### WARNING

1. ~~**Trigger list lookup not wired at provision time**~~ — Resolved: provisioner passes `listed_triggers`; env documented in README.

2. **Open onboarding from Workflows tab — manual smoke only** — Same workflow/trigger path as shortcut; no end-to-end Workflows-tab UI test. **Recommendation**: Run smoke checklist items after deploy (`docs/smoke-test-checklist.md`).

### SUGGESTION

_(none — added `workflow_trigger_registry_test.ts`, list-path integration test in `onboarding_channel_trigger_test.ts`, and `ProvisionInputs.listed_triggers` wiring)_

---

## Overall Decision

- [x] ✅ PASS
- [ ] ❌ FAIL

**Assessment**: No critical issues. One remaining warning (manual Workflows tab smoke after deploy). Ready for archive.

**Next Step**: `/opsx-archive`
