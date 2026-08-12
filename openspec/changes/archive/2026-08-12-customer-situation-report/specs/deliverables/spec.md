## ADDED Requirements

### Requirement: Situation Report manual publish

The system SHALL support manual, on-demand publication of a Situation Report canvas from the current Deliverables List state. Publish SHALL read all list rows, project customer-facing fields (Task ID, mapped customer status, Situation, Deliverable link, Open questions), group detail by Category, compute executive summary metrics from customer status buckets, set the **Generated** date to the publish timestamp, rotate the prior Current situation into a new Changelog row (Date, Summary, Highlights), and replace Current situation with the new snapshot. Publish SHALL NOT modify Deliverables List rows.

#### Scenario: First publish creates current snapshot

- **GIVEN** a TES event channel with a seeded Situation Report canvas and Deliverables List rows
- **WHEN** a user triggers Publish situation report
- **THEN** the Situation Report canvas SHALL contain a Generated date equal to the publish time
- **AND** Current situation SHALL list each deliverable with customer-facing status labels
- **AND** Assignee and Requirements fields SHALL NOT appear in the report body

#### Scenario: Subsequent publish appends changelog row

- **GIVEN** a Situation Report canvas with an existing Current situation and Generated date
- **WHEN** a user triggers Publish situation report again
- **THEN** the prior snapshot SHALL appear as a new row in the Changelog table
- **AND** Current situation and Generated date SHALL reflect the new publish

#### Scenario: Internal status mapped to customer bucket on publish

- **GIVEN** a deliverable row with internal status "Blocked"
- **WHEN** Publish situation report runs
- **THEN** the item SHALL display customer bucket label "Needs your input" (or configured label from domain JSON)
- **AND** the internal status string "Blocked" SHALL NOT appear in the customer report body

### Requirement: Delivery excerpt placeholder

Situation Report deliverable detail blocks SHALL include a reserved Delivery excerpt subsection. At MVP the subsection SHALL NOT read Delivery Template Canvas content and SHALL display placeholder copy indicating pending delivery canvas structure.

#### Scenario: Delivery excerpt not populated at MVP

- **GIVEN** a deliverable with a linked Delivery Template Canvas
- **WHEN** Publish situation report runs
- **THEN** the Delivery excerpt subsection SHALL remain placeholder text
- **AND** the Deliverable link field SHALL still appear when present on the list row

## MODIFIED Requirements

### Requirement: Deliverable list schema

Deliverables List rows SHALL use the mandatory core fields. The list column schema SHALL be defined in `slack-app/content/lists/deliverables.json` with stable column `key` values. Status select options SHALL reference `@domain/deliverable-statuses`. The schema SHALL include an **Open questions** column used as a source field for Situation Report publishing.

#### Scenario: Core fields populated

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** the list row is created
- **THEN** Task ID, Assignee, Status, Situation, Category, Requirements, Due date, Deliverable, and Open questions fields SHALL be populated per schema
