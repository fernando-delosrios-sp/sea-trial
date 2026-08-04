# Retrospective: tes-slack-process-mvp

> Written: 2026-08-04 (after verify PASS)
> Commit range: `n/a..n/a` (no git commits at write-time)
> Worktree: `/Users/fernando.delosrios/Documents/Development/TES/tes-event-process`

---

## 0. Evidence

- **Commit range**: none (repo had no commits at retro write-time)
- **Diff size**: ~45 TypeScript source files across `slack-app/`, `agent-service/`, `packages/shared/`
- **Tasks done**: 44/45 (`grep` — task 8.2 unchecked, manual smoke test)
- **Active hours**: ~2 sessions (apply + verify-fix)
- **Subagent dispatches**: 0 (controller executed directly; subagent-driven-development not fully invoked)
- **New external dependencies**: `@langchain/langgraph`, `@langchain/core` (agent-service)
- **Bugs encountered post-merge**: none (uncommitted)
- **OpenSpec validate state at archive**: pass (8/8 items valid)
- **Test coverage signal**: 32 Deno tests (slack-app) + 17 Vitest tests (agent-service) + 1 shared test

Commit chain: *No commits — implementation exists as uncommitted working tree.*

---

## 1. Wins

- [evidence: verify.md PASS] Full MVP scaffold delivered: monorepo, slack-app, agent-service, shared types
- [evidence: slack-app/tests/*.ts — 32 passed] Scenario test coverage expanded from 13 to 32 after verify-fix
- [evidence: agent-service/src/agents/requirements/langgraph.ts] LangGraph.js StateGraph pipeline satisfies design D3
- [evidence: slack-app/lib/onboarding-submit.ts + submit_onboarding/mod.ts] Critical submit_onboarding bug fixed — Dashboard metadata round-trip works
- [evidence: openspec validate 8/8] Main specs corrected with Purpose/Requirements headers

## 2. Misses

- 🔴 [blocking | tasks.md:8.2] Slack dev tenant smoke test not executed — requires human with installed app
- 🟡 [painful | git log empty] No commits created during apply — archive step 5d blocked
- 🟡 [painful | verify first pass] Initial apply marked task 8.2 complete without execution; caught by verify
- 🟡 [painful | parsers/index.ts] PDF/DOCX/XLSX parsers are regex-based MVP stubs, not production libraries
- 📌 [nit | seed flow] tes_onboard trigger passes empty `dashboard_canvas_content` — caller must supply canvas content

## 3. Plan deviations

| Plan task | What changed | Why |
|-----------|--------------|-----|
| 1.4 LangGraph.js | Custom pipeline first, LangGraph wrapper added in verify-fix | Faster MVP scaffold; wrapped in StateGraph after verify FAIL |
| 8.2 Smoke test | Checklist only; task unchecked | No Slack dev tenant access in agent environment |
| Apply archive/PR | Not reached | User cancelled archive pending retro + smoke test |
| Subagent-driven-development | Skipped | Controller implemented directly in single session |

## 4. Skill / workflow compliance

| Skill | Used |
|-------|------|
| superpowers:brainstorming | ✓ (artifact exists) |
| superpowers:writing-plans | ✓ (plan.md exists) |
| superpowers:using-git-worktrees | ✗ |
| superpowers:subagent-driven-development | ✗ |
| (transitive) superpowers:test-driven-development | partial |
| (transitive) superpowers:requesting-code-review | ✗ |
| superpowers:finishing-a-development-branch | ✗ |

### Deliberately Skipped Skills

- **`superpowers:using-git-worktrees`**
  - **What was skipped**: Isolated worktree creation
  - **Why this cycle**: Repo had zero commits; worktree add requires at least one commit on main
  - **How to prevent recurrence**: `one-off — schema boundary case` — initial commit before apply on greenfield repos

- **`superpowers:subagent-driven-development`**
  - **What was skipped**: Per-task implementer/reviewer subagent loop
  - **Why this cycle**: Single-session controller executed all 45 tasks directly to meet apply deadline
  - **How to prevent recurrence**: `scope-judgment rule` — greenfield MVP with no git history may use direct execution if controller tracks verify-fix loop

- **`superpowers:finishing-a-development-branch`**
  - **What was skipped**: PR creation
  - **Why this cycle**: Archive cancelled by user; no commits to branch
  - **How to prevent recurrence**: Initial commit before archive step

## 5. Surprises

- First verify FAIL revealed submit_onboarding never wrote Dashboard canvas despite task marked complete
- Main specs at `openspec/specs/` lacked Purpose headers — fixed during apply, not during spec authoring
- Deno was not pre-installed; installed mid-session via install script

## 6. Promote candidates -> long-term learning

- [ ] 🔴 **Greenfield repos need initial commit before worktree/archive** -> **Promote to AGENTS.md**
  > **Why**: Worktree and archive commit steps fail silently on zero-commit repos
  > **How to apply**: Apply step 0 on greenfield — create `chore: init` commit before worktree

- [ ] 🟡 **Never mark manual dogfood tasks [x] without execution evidence** -> **Promote to verify.md rules**
  > **Why**: Task 8.2 was checked complete with only a checklist file
  > **How to apply**: Verify step 2 flags `[x]` tasks referencing manual checklists without log entry

- [ ] 🟡 **Document parser library selection before apply** -> **Promote to design.md open questions**
  > **Why**: Regex parsers shipped as MVP; may fail on real PDF/DOCX
  > **How to apply**: Next change touching parsers must pick pdf-parse/mammoth/xlsx explicitly

- [ ] 📌 **tes_onboard trigger needs dashboard content wiring** -> **One-off**
  > **Why**: Shortcut trigger scaffold passes empty canvas content; index CTA must pass real content
  > **How to apply**: Wire pinned index button to open_onboarding with dashboard markdown
