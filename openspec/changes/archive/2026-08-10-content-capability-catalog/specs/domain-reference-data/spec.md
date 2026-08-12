## ADDED Requirements

### Requirement: Domain refs registered in capability catalog

Each `@domain/*` reference used by content compilers SHALL be registered in the capability catalog domain ref registry with a pointer to its source JSON file under `slack-app/content/domain/`.

#### Scenario: Deliverable statuses ref registered

- **GIVEN** the capability catalog domain ref registry
- **WHEN** it is loaded
- **THEN** `@domain/deliverable-statuses` SHALL map to `deliverable-statuses.json`

#### Scenario: SailPoint suites ref registered

- **GIVEN** the capability catalog domain ref registry
- **WHEN** it is loaded
- **THEN** `@domain/sailpoint-suites` SHALL map to `sailpoint-suites.json`

#### Scenario: Unregistered ref not resolvable

- **GIVEN** content referencing `@domain/not-registered`
- **WHEN** validation or compilation runs
- **THEN** a descriptive error SHALL be thrown
