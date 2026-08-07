## ADDED Requirements

### Requirement: Declarative modal content

Modal Block Kit definitions SHALL live in `slack-app/content/modals/*.json` with a `contract.block_ids` array. Submit handlers SHALL continue to parse submissions by those block IDs. Dynamic fields (Account prefill, SailPoint suite options) SHALL be applied at compile time via a `dynamic` overlay referencing domain JSON.

#### Scenario: Create TES Event modal from content file

- **GIVEN** `create-tes-event.json` defines the creation modal blocks and contract
- **WHEN** the open-create function builds the modal view
- **THEN** the view SHALL match the JSON block definitions
- **AND** `contract.block_ids` SHALL match the submit parser field IDs

#### Scenario: Onboarding modal from content file with domain overlay

- **GIVEN** `onboarding.json` defines onboarding blocks and dynamic overlay for `sailpoint_suite`
- **WHEN** the onboarding modal is built
- **THEN** SailPoint Suite select options SHALL be resolved from `@domain/sailpoint-suites`
- **AND** Account prefill SHALL be applied when `accountName` is provided

### Requirement: Declarative canvas content

Canvas markdown SHALL be authored in `slack-app/content/canvases/*.hbs.md` and rendered via Handlebars. The `<!-- tes-event-context -->` metadata block SHALL be injected by code after rendering, not embedded in editorial templates.

#### Scenario: Dashboard canvas from template

- **GIVEN** a `TesEventContext` with creation fields set
- **WHEN** the dashboard canvas is rendered
- **THEN** the Project section SHALL include Account, Salesforce URL, members, notes, and status
- **AND** metadata JSON SHALL be appended by the renderer

#### Scenario: Static canvases from templates

- **GIVEN** Requirements and Infrastructure seeding runs
- **WHEN** canvas content is loaded
- **THEN** content SHALL come from `requirements.hbs.md` and `infrastructure.hbs.md`

### Requirement: Declarative list definitions

List column schemas SHALL be defined in `slack-app/content/lists/*.json` with stable `key` fields. Select column options referencing domain vocabulary SHALL use `@domain/deliverable-statuses` refs resolved at compile time.

#### Scenario: Deliverables list schema from JSON

- **GIVEN** `deliverables.json` defines columns including Status with `@domain/deliverable-statuses`
- **WHEN** the Deliverables list is created
- **THEN** the Slack list schema SHALL match the JSON column definitions
- **AND** Status select options SHALL match domain JSON choices

### Requirement: Declarative message templates

Pinned index Block Kit SHALL be authored in `slack-app/content/messages/pinned-index.hbs.json` and rendered via Handlebars with conditional onboarding button blocks.

#### Scenario: Pinned index onboarding button conditional

- **GIVEN** `onboardingComplete` is false
- **WHEN** pinned index blocks are rendered
- **THEN** a Complete onboarding button block SHALL be present
- **WHEN** `onboardingComplete` is true
- **THEN** the button block SHALL be omitted

### Requirement: Content loader validation

Content loaders SHALL validate JSON structure at load time and expose typed accessors. Tests SHALL assert block_id contracts and `@domain/*` resolution.

#### Scenario: Invalid modal content fails validation

- **GIVEN** a modal JSON file missing `contract.block_ids`
- **WHEN** validation runs
- **THEN** an error SHALL be thrown before the modal is used
