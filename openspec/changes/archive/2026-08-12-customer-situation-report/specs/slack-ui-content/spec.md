## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Declarative canvas content

Canvas markdown SHALL be authored in `slack-app/content/canvases/*.hbs.md` and rendered via Handlebars. The `<!-- tes-event-context -->` metadata block SHALL be injected by code after rendering, not embedded in editorial templates. Situation Report canvases SHALL use `situation-report.hbs.md` as their editorial source.

#### Scenario: Dashboard canvas from template

- **GIVEN** a `TesEventContext` with creation fields set
- **WHEN** the dashboard canvas is rendered
- **THEN** the Project section SHALL include Account, Salesforce URL, members, notes, and status
- **AND** metadata JSON SHALL be appended by the renderer

#### Scenario: Static canvases from templates

- **GIVEN** Requirements, Infrastructure, and Situation Report seeding runs
- **WHEN** canvas content is loaded
- **THEN** content SHALL come from `requirements.hbs.md`, `infrastructure.hbs.md`, and `situation-report.hbs.md` respectively
