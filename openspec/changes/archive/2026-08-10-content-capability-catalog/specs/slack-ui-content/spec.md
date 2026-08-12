## MODIFIED Requirements

### Requirement: Declarative list definitions

List column schemas SHALL be defined in `slack-app/content/lists/*.json` with stable `key` fields and Slack-native column shapes. Select column options referencing domain vocabulary SHALL use `options_ref: "@domain/deliverable-statuses"` (or other registered refs) resolved at compile time into `options.choices`. Inline select options SHALL use `options: { format, choices[] }` per the capability catalog.

#### Scenario: Deliverables list schema from JSON

- **GIVEN** `deliverables.json` defines columns including Status with `@domain/deliverable-statuses`
- **WHEN** the Deliverables list is created
- **THEN** the Slack list schema SHALL match the compiled column definitions
- **AND** Status select options SHALL match domain JSON choices under `options.choices`

#### Scenario: Incidents inline select uses Slack shape

- **GIVEN** `incidents.json` defines a Status column with inline choices
- **WHEN** the list JSON is validated
- **THEN** choices SHALL be nested under `options.choices`
- **AND** `options.format` SHALL be present

---

### Requirement: Content loader validation

Content loaders SHALL validate authored files against the capability catalog at load time and expose typed accessors. Tests SHALL assert block_id contracts, catalog rejection of invalid type/property combinations, and `@domain/*` resolution via the domain ref registry.

#### Scenario: Invalid modal content fails validation

- **GIVEN** a modal JSON file missing `contract.block_ids`
- **WHEN** validation runs
- **THEN** an error SHALL be thrown before the modal is used

#### Scenario: Invalid list column property fails validation

- **GIVEN** a list JSON file with a `text` column containing `options`
- **WHEN** validation runs
- **THEN** an error SHALL be thrown before the list is used

#### Scenario: Unknown options_ref fails validation

- **GIVEN** a list column with an unregistered `options_ref`
- **WHEN** validation runs
- **THEN** an error SHALL be thrown before the list is used
