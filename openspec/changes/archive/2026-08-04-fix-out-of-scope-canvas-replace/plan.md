# Fix Out of Scope Canvas Replace Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development
> to implement this plan task-by-task.

**Goal:** Prevent duplicate `## Out of Scope` sections when the Requirements Agent runs multiple times.

**Architecture:** One-line pattern change in `buildUpdatedCanvas` to match Documents processed / Deliverable Candidates header-replace logic; regression test in agent-rules.test.ts.

**Tech Stack:** TypeScript, Vitest

**Canonical test command:** `cd agent-service && npm test`

---

## Task 1: Regression test (TDD)

- [ ] **Step 1:** In `agent-service/tests/agent-rules.test.ts`, add test under `second session extends canvas`:
  - Existing canvas with `## Out of Scope\n- SAP integration`
  - Call `buildUpdatedCanvas` with `outOfScope: ["Legacy mainframe connector"]`
  - Assert `(updated.match(/## Out of Scope/g) ?? []).length === 1`
  - Assert updated contains new item
- [ ] **Step 2:** Run `cd agent-service && npm test` — expect new test to fail

## Task 2: Implementation

- [ ] **Step 3:** In `graph.ts` `buildUpdatedCanvas`, replace Out of Scope append block with:

```typescript
if (outOfScope.length) {
  const outOfScopeSection = outOfScope.map((o) => `- ${o}`).join("\n");
  if (updated.includes("## Out of Scope")) {
    updated = updated.replace(
      "## Out of Scope",
      `## Out of Scope\n${outOfScopeSection}\n`,
    );
  } else {
    updated += `\n\n## Out of Scope\n${outOfScopeSection}`;
  }
}
```

- [ ] **Step 4:** Run `cd agent-service && npm test` — all tests pass

## Task 3: Changelog

- [ ] **Step 5:** Update CHANGELOG.md with fix entry under Unreleased
