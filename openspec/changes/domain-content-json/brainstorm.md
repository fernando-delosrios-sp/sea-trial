# Brainstorm: domain-content-json

## Context

Exploration session identified that domain reference data (SailPoint suite→component mappings, deliverable status enums) lives in TypeScript (`suite-components.ts`, `packages/shared` union types) while upcoming declarative UI content (modals, lists) needs the same values as JSON-select options. Slack native channel templates were evaluated and rejected as an implementation vehicle.

## Decision chain

**Q1: Where should domain reference data live?**
→ `slack-app/content/domain/*.json` in repo; all editorial and reference data stays in code (no external CMS).

**Q2: Relationship to `packages/shared` types?**
→ JSON is canonical for slack-app content; shared TypeScript unions remain for agent-service HTTP contract. Sync enforced by tests (choices match `DeliverableStatus`, suite names match `OnboardingForm.sailpointSuite` usage).

**Q3: JSON vs YAML?**
→ JSON in principle (consistent with modals/lists); domain files are small and machine-consumed.

**Q4: What moves in this change vs later changes?**
→ This change only: extract existing domain data + loader + tests. No modals/canvases/composition yet.

## Design trade-offs

| Approach | Pros | Cons |
|---|---|---|
| JSON canonical + TS sync tests | Minimal agent-service churn; clear ownership | Two representations until type generation |
| Generate TS from JSON | Single source | Scope creep; agent-service build coupling |
| Keep TS canonical, export JSON at build | No drift | Defeats "content in files" goal |

**Chosen:** JSON canonical for slack-app; sync tests against shared types.

## Initial file set

- `content/domain/sailpoint-suites.json` — replaces `suite-components.ts` data
- `content/domain/deliverable-statuses.json` — select choices for Deliverables list (value === label)
- `lib/content/domain.ts` — load, validate, typed accessors (`getSupportedSuites()`, `deriveComponents()`, status choices)
- JSON Schema under `slack-app/schemas/domain/`

## Out of scope (this change)

- Modal/list/canvas content files
- Channel composition manifest
- Handlebars
- Slack channel templates

## Dependency

None — first change in sequence. Unblocks `declarative-slack-content`.
