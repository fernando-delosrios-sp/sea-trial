## MODIFIED Requirements

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

## ADDED Requirements

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
