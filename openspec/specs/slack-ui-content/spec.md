# slack-ui-content Specification

## Purpose
TBD - created by archiving change declarative-slack-content. Update Purpose after archive.
## Requirements
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

Canvas markdown SHALL be authored in `slack-app/content/canvases/*.hbs.md` and rendered via Handlebars. The `<!-- tes-event-context -->` metadata block SHALL be injected by code after rendering, not embedded in editorial templates. Situation Report canvases SHALL use `situation-report.hbs.md` as their editorial source. Delivery Template Canvases SHALL use `delivery.hbs.md` as their editorial source.

#### Scenario: Dashboard canvas from template

- **GIVEN** a `TesEventContext` with creation fields set
- **WHEN** the dashboard canvas is rendered
- **THEN** the Project section SHALL include Account, Salesforce URL, members, notes, and status
- **AND** metadata JSON SHALL be appended by the renderer

#### Scenario: Static canvases from templates

- **GIVEN** Requirements, Infrastructure, Situation Report, and Delivery Template seeding or creation runs
- **WHEN** canvas content is loaded
- **THEN** content SHALL come from `requirements.hbs.md`, `infrastructure.hbs.md`, `situation-report.hbs.md`, and `delivery.hbs.md` respectively

### Requirement: Delivery canvas template

Canvas markdown for per-deliverable Delivery Template Canvases SHALL be authored in `slack-app/content/canvases/delivery.hbs.md`. The template SHALL define a metadata block (Author, Category, Draft version, generated timestamp, review flag, Consolidate draft and Mark reviewed actions) and fixed H2 sections: **Business value**, **Visual proof**, **SailPoint components**, **External technologies**, **Customer summary** (customer-facing), **Artefacts**, **Configuration** (internal), and **Notes** (freeform). The `<!-- tes-event-context -->` metadata block SHALL NOT appear in the author template.

#### Scenario: Delivery canvas template loads and validates

- **GIVEN** `delivery.hbs.md` exists under `content/canvases/`
- **WHEN** the canvas renderer loads the template
- **THEN** validation SHALL pass per the canvas capability catalog
- **AND** the template SHALL include all required H2 sections

#### Scenario: Customer summary section marked for excerpt

- **GIVEN** `delivery.hbs.md` defines a Customer summary section
- **WHEN** the template is validated
- **THEN** the Customer summary heading SHALL use the exact text `## Customer summary`
- **AND** the section SHALL be identifiable by Situation Report excerpt extraction code

### Requirement: Situation Report canvas template

Canvas markdown for customer-facing situation reports SHALL be authored in `slack-app/content/canvases/situation-report.hbs.md`. The template SHALL define, at minimum: a title including project name, a **Generated** date field, an **Executive summary** section, a **Current situation** section with category-grouped deliverable detail blocks, and a **Changelog** section containing a markdown table with columns Date, Summary, and Highlights. Each deliverable detail block SHALL expose placeholders for Task ID, customer-facing status label, Situation, Deliverable link, Open questions, and a reserved Delivery excerpt subsection. The `<!-- tes-event-context -->` metadata block SHALL NOT appear in the author template.

#### Scenario: Situation report template loads and validates

- **GIVEN** `situation-report.hbs.md` exists under `content/canvases/`
- **WHEN** the canvas renderer loads the template
- **THEN** validation SHALL pass per the canvas capability catalog
- **AND** the template SHALL include Executive summary, Current situation, and Changelog sections

#### Scenario: Initial seed renders generation date placeholder

- **GIVEN** a `TesEventContext` with project and account fields
- **WHEN** the Situation Report canvas is seeded on channel create
- **THEN** the rendered markdown SHALL include a Generated date
- **AND** Current situation SHALL contain an empty-state message until first publish

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

### Requirement: Declarative message templates

Pinned index Block Kit SHALL be authored in `slack-app/content/messages/pinned-index.hbs.json` and rendered via Handlebars with conditional onboarding button blocks.

#### Scenario: Pinned index onboarding button conditional

- **GIVEN** `onboardingComplete` is false
- **WHEN** pinned index blocks are rendered
- **THEN** a Complete onboarding button block SHALL be present
- **WHEN** `onboardingComplete` is true
- **THEN** the button block SHALL be omitted

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


