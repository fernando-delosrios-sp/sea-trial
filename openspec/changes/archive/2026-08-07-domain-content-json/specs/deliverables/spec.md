## ADDED Requirements

### Requirement: Deliverable status vocabulary from domain JSON

Deliverable status select choices SHALL be sourced from `slack-app/content/domain/deliverable-statuses.json` and SHALL remain aligned with the canonical `DeliverableStatus` vocabulary in `packages/shared`.

#### Scenario: Status choices match shared type

- **GIVEN** `deliverable-statuses.json` is loaded
- **WHEN** status choices are retrieved via the domain loader
- **THEN** every choice value SHALL be a valid `DeliverableStatus`
- **AND** the choice set SHALL include "Not started" and "Needs clarification"

#### Scenario: Default status in review gate

- **GIVEN** a deliverable proposal with suggested status "Not started"
- **WHEN** a user accepts the proposal
- **THEN** the list row status SHALL be a value defined in domain JSON
