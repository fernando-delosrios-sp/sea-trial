## 1. Domain JSON content files

- [x] 1.1 Add `slack-app/content/domain/sailpoint-suites.json` mirroring current `SUITE_COMPONENTS` data
- [x] 1.2 Add `slack-app/content/domain/deliverable-statuses.json` with all `DeliverableStatus` values (value === label)
- [x] 1.3 Add JSON Schema files under `slack-app/schemas/domain/` for both domain files

## 2. Domain loader

- [x] 2.1 Add `slack-app/lib/content/domain.ts` — load, validate, expose `getSupportedSuites()`, `deriveComponents()`, `getDeliverableStatusChoices()`
- [x] 2.2 Refactor `slack-app/lib/suite-components.ts` to thin re-exports from domain loader
- [x] 2.3 Wire onboarding modal to use domain loader (via existing `getSupportedSuites` import path)

## 3. Spec scenario coverage — domain-reference-data

- [x] 3.1 Test: sailpoint-suites.json loads with expected suite keys
- [x] 3.2 Test: deliverable-statuses.json loads with value === label
- [x] 3.3 Test: valid domain files pass schema validation
- [x] 3.4 Test: invalid domain file throws validation error
- [x] 3.5 Test: DeliverableStatus bidirectional sync with shared type
- [x] 3.6 Test: deriveComponents returns JSON-defined components per suite

## 4. Spec scenario coverage — onboarding

- [x] 4.1 Test: onboarding modal suite options match domain JSON keys
- [x] 4.2 Test: Identity Security Cloud mapping unchanged (regression)

## 5. Spec scenario coverage — deliverables

- [x] 5.1 Test: status choices include "Not started" and "Needs clarification"
- [x] 5.2 Test: accepted proposal status is valid domain JSON value

## 6. Documentation

- [x] 6.1 Update README — document `slack-app/content/domain/` and domain loader
- [x] 6.2 N/A — no API/connector contract changes (mark complete with reason)
- [x] 6.3 Add JSDoc to domain loader public accessors

## 7. Changelog

- [x] 7.1 Create or update changelog entry for domain-content-json
- [x] 7.2 Confirm entry covers domain-reference-data capability
