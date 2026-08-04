## Context

`buildUpdatedCanvas` merges new agent output into existing Requirements Canvas markdown. Four sections already use a replace-if-present pattern keyed on `##` headers. Out of Scope is the outlier — it unconditionally appends.

## Goals / Non-Goals

**Goals**
- Out of Scope follows the same header-replace pattern as Documents processed and Deliverable Candidates
- Regression test covers a second agent run with out-of-scope items

**Non-Goals**
- Rewriting section-replacement to strip stale bullet lines (affects all sections equally)
- Changing out-of-scope detection logic in `extractDeliverables`

## Decisions

**Use header replace, not full-section regex**
- Rationale: Matches existing canvas update convention in the same function; minimal diff, low risk
- Alternative considered: Regex to replace entire section including bullets — rejected as scope creep

**Skip update when `outOfScope` is empty**
- Rationale: Consistent with `documentsSection` and `candidatesSection` guards

## Risks / Trade-offs

- [Stale bullets may remain under replaced header] → Same pre-existing behavior as other sections; acceptable for this bugfix

## Migration Plan

Deploy with normal agent-service release. No data migration — canvases self-correct on next agent run.

## Open Questions

(none)
