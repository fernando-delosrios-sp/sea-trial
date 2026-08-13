# Retrospective: attach-lists-to-channel-tabs

> Written: 2026-08-13 (after verify passed)
> Commit range: `pre-commit..HEAD` (pending first commit on feature branch)
> Worktree: local on `main` (no worktree)

---

## 0. Evidence

- **Commit range**: uncommitted at retro write; implementation staged for `feat/attach-lists-to-channel-tabs`
- **Diff size**: ~15 files across slack-app, docs, openspec change artifacts
- **Tasks done**: 11/11 (`grep -cE '^\s*- \[x\]' tasks.md` → 11)
- **Active hours**: ~1 session (spike analysis + implementation)
- **Subagent dispatches**: n/a (direct implementation on local path)
- **New external dependencies**: none (`bookmarks:write` scope only)
- **Bugs encountered post-merge**: none
- **OpenSpec validate state at archive**: pass (13/13 valid)
- **Test coverage signal**: 196 Deno tests pass (`cd slack-app && deno task test`)

Commit chain (chronological):

```
(pending) feat: attach lists to channel via bookmarks fallback
(pending) docs(openspec): archive attach-lists-to-channel-tabs and sync specs
```

---

## 1. Wins

- [evidence: `slack-app/lib/lists.ts` + `lists_test.ts`] Bookmarks fallback gives discoverable list links without blocking on undocumented Slack list-tab API.
- [evidence: `design.md` Open Questions resolved] Spike conclusion documented from live channel `C0BPY7THJ85` — zero list tabs despite create + access.set.
- [evidence: `composition_test.ts`] Provisioner integration test asserts bookmark attach order for both lists.
- [evidence: `seedListItems` + test] Select slugification prevents latent `items.create` failures on seed rows.

## 2. Misses

- 🟡 [painful | evidence: no `SLACK_BOT_TOKEN` locally] Live spike script not executed in CI agent session; conclusion relies on prior channel inspection + docs.
- 🟡 [painful | evidence: smoke checklist] Manual smoke on dev tenant still pending post-deploy (`bookmarks:write` requires app reinstall).
- 📌 [nit | evidence: spec wording] Spec says "list tab" but fallback is channel bookmarks — acceptable per design D3 but UX differs from canvases.

## 3. Plan deviations

| Plan task | What changed | Why |
|-----------|--------------|-----|
| 1.2 Live spike | Used prior channel inspection + docs instead of fresh token run | No bot token in agent environment |
| Task 5 native tabs | Skipped — went straight to bookmarks | Spike confirmed no native API |

## 4. Skill / workflow compliance

| Skill                                            | Used |
|--------------------------------------------------|------|
| superpowers:brainstorming                        | ✓ (prior session) |
| superpowers:writing-plans                        | ✓ (plan.md) |
| superpowers:using-git-worktrees                  | ✗ (user chose local) |
| superpowers:subagent-driven-development          | ✗ (direct implementation) |
| (transitive) superpowers:test-driven-development | ✓ (tests written/updated) |
| (transitive) superpowers:requesting-code-review  | ✗ (not invoked) |
| superpowers:finishing-a-development-branch       | pending (PR step) |

### Deliberately Skipped Skills

- **`superpowers:using-git-worktrees`**
  - **What was skipped**: Isolated worktree checkout
  - **Why this cycle**: User continued on local branch per prior apply session choice
  - **How to prevent recurrence**: one-off — user preference at apply step 1

- **`superpowers:subagent-driven-development`**
  - **What was skipped**: Per-task subagent dispatch
  - **Why this cycle**: Focused change (~5 files core logic); direct implementation faster
  - **How to prevent recurrence**: scope-judgment rule — invoke for multi-module changes spanning 10+ files

## 5. Surprises

- Official Slack Node SDK types exclude `channel_id` on `slackLists.create` while unofficial OpenAPI specs include it — neither creates list tabs.
- Slack help docs describe sharing lists via messages, not channel tabs — bookmarks are the practical programmatic surface.

## 6. Promote candidates -> long-term learning

- [ ] 🟡 **Reinstall reminder when adding bot scopes** -> **Promote to docs/smoke-test-checklist.md** (deploy section)
  > **Why**: `bookmarks:write` added; existing installs lack scope until reinstall
  > **How to apply**: Add deploy checklist bullet whenever manifest botScopes change

- [ ] 📌 **List-tab vs bookmark UX gap** -> **One-off** (monitor Slack Lists API changelog)
  > **Why**: May become native tabs later; bookmarks are interim
  > **How to apply**: Re-spike when Slack announces list channel attachment
