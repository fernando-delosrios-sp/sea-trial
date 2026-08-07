## Why

Domain reference data (SailPoint suite→component mappings, deliverable status enums) is embedded in TypeScript modules while modals and lists need the same values as declarative select options. That scatters editorial data across code, blocks the planned content layer, and risks drift between list schema choices and `packages/shared` types. Extracting domain definitions to JSON first establishes a shared foundation without touching channel provisioning or UI structure.

## What Changes

**Domain reference data externalization**
- From: `suite-components.ts` and hardcoded status strings in list/onboarding code
- To: `slack-app/content/domain/*.json` with a typed loader in `lib/content/domain.ts`
- Reason: Single source for suite options, derived components, and list select choices
- Impact: Non-breaking; behavior preserved via sync tests

**Validation**
- From: Implicit TS types only
- To: JSON Schema validation at load time + tests asserting parity with `DeliverableStatus` and suite keys
- Reason: Catch drift before deploy
- Impact: New test suite

## Capabilities

### New Capabilities

- `domain-reference-data`: JSON-defined reference enums and mappings (suites, deliverable statuses) loaded by slack-app with schema validation and shared-type sync tests.

### Modified Capabilities

- `onboarding`: SailPoint suite select options SHALL be sourced from domain JSON (requirement: configurable without code edits to option list).
- `deliverables`: Deliverable status select choices SHALL be sourced from domain JSON and SHALL remain aligned with the canonical status vocabulary.

## Impact

- **New:** `slack-app/content/domain/`, `slack-app/lib/content/domain.ts`, `slack-app/schemas/domain/`, tests
- **Removed/refactored:** `slack-app/lib/suite-components.ts` (logic moves to loader; file deleted or reduced to thin re-exports during migration)
- **Unchanged:** agent-service, channel provisioning, modals/canvases (deferred to `declarative-slack-content`)
- **Sequence:** Change 1 of 3 — must land before `declarative-slack-content`
