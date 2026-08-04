# Brainstorm: Fix Out of Scope canvas section duplication

## Context

`buildUpdatedCanvas` in `agent-service/src/agents/requirements/graph.ts` updates the Requirements Canvas markdown on each agent run. Most sections (Session Log, Documents processed, Deliverable Candidates, Extracted Requirements) check for an existing `##` header and replace it; Out of Scope always appends a new section at the end.

## Verified issue

```typescript
// Lines 262-264 — always append
if (outOfScope.length) {
  updated += `\n\n## Out of Scope\n${outOfScope.map((o) => `- ${o}`).join("\n")}`;
}
```

On a second agent run with out-of-scope items, the canvas gets duplicate `## Out of Scope` headers.

## Decision chain

**Q1: What is the correct behavior?**
- Match the replace-if-present / append-if-absent pattern used by Documents processed and Deliverable Candidates.

**Q2: Should we strip old bullet content under the header?**
- No — not in scope. Other sections use the same header-replace approach; fixing Out of Scope parity is sufficient for this change.

**Q3: What if `outOfScope` is empty on a subsequent run?**
- Leave existing section unchanged (same as Documents processed when `documentsSection` is empty).

## Trade-offs

- Header-only replace may leave stale bullets below new content (pre-existing pattern across all canvas sections). Acceptable — separate improvement if needed.
