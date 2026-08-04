## Why

The Requirements Agent updates the Requirements Canvas on every run. The Out of Scope section in `buildUpdatedCanvas` always appends a new `## Out of Scope` block instead of updating an existing one. On subsequent runs this produces duplicate section headers and confusing canvas content for TES users reviewing requirements.

## What Changes

**Out of Scope canvas section update**
- From: Always append `\n\n## Out of Scope\n...` to canvas markdown
- To: Replace existing `## Out of Scope` header when present; append only when absent (same pattern as Documents processed and Deliverable Candidates)
- Reason: Consistent incremental canvas updates across agent sessions
- Impact: Non-breaking — corrects buggy behavior; no API contract change

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `requirements-agent`: Canvas Out of Scope section SHALL be updated in place on subsequent agent runs, not duplicated

## Impact

- **agent-service/src/agents/requirements/graph.ts** — `buildUpdatedCanvas` Out of Scope branch
- **agent-service/tests/agent-rules.test.ts** — regression test for second-session Out of Scope update
