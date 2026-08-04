# Retrospective: document-parsing-and-memory

> Written: 2026-08-04 (after verify PASS)
> Commit range: uncommitted on `feature/document-parsing-and-memory`
> Worktree: `/Users/fernando.delosrios/Documents/Development/TES/tes-event-process`

---

## 0. Evidence

- **Commit range**: no implementation commits yet (session work uncommitted at retro write)
- **Diff size**: ~40+ files touched (parsers, shared types, LangGraph nodes, slack transport, tests, docs)
- **Tasks done**: 25/25
- **Subagent dispatches**: n/a (direct apply in single session)
- **New external dependencies**: mammoth ^1.12, xlsx ^0.18.5, pdf-parse ^2.4.5, jszip (dev fixtures)
- **OpenSpec validate state at archive**: pass (all items valid)
- **Test coverage signal**: agent-service 33/33 vitest; slack-app 42/42 deno test

---

## 1. Wins

- [evidence: `agent-service/src/parsers/*.ts`, `tests/parsers.test.ts`] Dedicated parser modules with fixture coverage for TXT/DOCX/XLSX/PDF and image-only rejection
- [evidence: `packages/shared/src/types/index.ts`] `FilePayload` and `ParsedDocument` shared across Deno + Node
- [evidence: `langgraph.ts`, `graph-order.test.ts`] Full graph order with `formatOutput` and Documents processed canvas section
- [evidence: `semantic-analyzer.ts`, `semantic-analyzer.test.ts`] LLM semantic path with test injection and heuristic fallback

## 2. Misses

- 🟡 [painful | pdf-parse v2 API] Initial pdf-parse v1 import failed; v2 uses `PDFParse` class — required fixture tuning for image-only detection
- 📌 [nit | mixed branch] `github-actions-deploy-config` artifacts present on same branch — keep changes isolated in future

## 3. Plan deviations

| Plan task | What changed | Why |
|-----------|--------------|-----|
| 2.4 pdf-parse vs pdfjs-dist | Chose pdf-parse v2 (`PDFParse.getText`) | Fixture quality acceptable; stayed in TS stack |
| analyzeRequirements | Added `semantic-analyzer.ts` + async node | Verify gap — spec requires LLM semantic analysis |
| Worktree | Worked on feature branch in place | No separate worktree created |

## 4. Skill / workflow compliance

| Skill | Used |
|-------|------|
| superpowers:brainstorming | ✓ (artifact exists) |
| superpowers:writing-plans | ✓ (plan.md) |
| superpowers:using-git-worktrees | ✗ |
| superpowers:subagent-driven-development | ✗ |
| superpowers:finishing-a-development-branch | ✗ (pending post-archive) |

### Deliberately Skipped Skills

- **`using-git-worktrees`**
  - **What was skipped**: Isolated worktree creation
  - **Why this cycle**: Single developer on feature branch; no concurrent main-branch work
  - **How to prevent recurrence**: scope-judgment rule — use worktree when main has unpushed WIP

- **`subagent-driven-development`**
  - **What was skipped**: Per-task subagent dispatch + review loop
  - **Why this cycle**: Direct `/opsx-apply` in one session; tasks tightly sequential
  - **How to prevent recurrence**: schema boundary case for small focused changes in active session

## 5. Surprises

- pdf-parse v2 returns page markers (`-- 1 of 1 --`) on image-only PDFs — needed content heuristic, not just empty string check

## 6. Promote candidates -> long-term learning

- [ ] 🟡 **Always evaluate pdf-parse major version at install** -> **Promote to project CLAUDE.md**
  > **Why**: v1 default import silently broke tests until v2 API was used
  > **How to apply**: When adding PDF parser dep, read package README major version block first

- [ ] 📌 **Commit before archive when apply spans multiple tool invocations** -> **One-off**
  > **Why**: Retro evidence section lacks commit chain when archive runs on dirty tree
  > **How to apply**: Commit implementation before `/opsx:archive` in future cycles
