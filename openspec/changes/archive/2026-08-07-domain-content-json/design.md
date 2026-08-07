# Design: Domain Content JSON

## Context

SailPoint suite→component mappings live in `slack-app/lib/suite-components.ts` as a hardcoded `Record`. Deliverable status vocabulary lives only in `packages/shared/src/types/index.ts` as a TypeScript union. Upcoming declarative UI content (modals, lists) needs the same values as JSON select options. This change extracts domain reference data to versioned JSON files with a typed loader — first step in the content-layer sequence.

## Goals / Non-Goals

**Goals:**
- JSON canonical source for suite mappings and deliverable status choices under `slack-app/content/domain/`
- Typed loader with JSON Schema validation at load time
- Sync tests asserting parity with `DeliverableStatus` union and existing suite keys
- Non-breaking: `deriveComponents`, `getSupportedSuites` remain callable via thin re-exports

**Non-Goals:**
- Modal/list/canvas content files (deferred to `declarative-slack-content`)
- Channel composition manifest
- Generate TS types from JSON (sync tests only)
- Agent-service contract changes

## Decisions

### D1: JSON files in repo

**Choice:** `slack-app/content/domain/sailpoint-suites.json` and `deliverable-statuses.json`.

**Reason:** Consistent with planned modals/lists JSON; version-controlled and reviewable.

**Alternatives:** YAML (rejected — JSON matches downstream content layer); TS canonical with JSON export (rejected — defeats content-in-files goal).

### D2: Loader module pattern

**Choice:** `slack-app/lib/content/domain.ts` following `triggers-config.ts` pattern — parse, validate, expose typed accessors.

**Reason:** Established pattern in this repo; testable without Slack runtime.

### D3: JSON Schema validation

**Choice:** Schemas under `slack-app/schemas/domain/`; validate on load; fail fast in tests.

**Reason:** Catch editorial drift before deploy.

### D4: Shared types remain canonical for agent-service

**Choice:** `DeliverableStatus` union stays in `packages/shared`; sync test asserts JSON values ⊆ union and union ⊆ JSON.

**Reason:** Minimal agent-service churn; clear ownership boundary.

### D5: suite-components.ts migration

**Choice:** Replace inline data with re-exports from domain loader; keep file path for backward-compatible imports.

**Reason:** Avoid wide import churn in this change.

## Risks / Trade-offs

- [Risk] JSON and TS union drift → Mitigation: bidirectional sync test in CI
- [Trade-off] Two representations until type generation → Accepted: scoped to slack-app editorial boundary

## Migration Plan

1. Add JSON files mirroring current `SUITE_COMPONENTS` and `DeliverableStatus` values
2. Add loader + schemas + tests
3. Refactor `suite-components.ts` to delegate to loader
4. Run `npm test` — all existing suite/onboarding tests pass
5. No deploy config changes

Rollback: revert loader; restore inline TS data.

## Open Questions

None — scope locked in brainstorm.
