# Deliverables

## Purpose

Review gate, Deliverables List writes, on-demand Delivery Template Canvas creation, and customer-facing Situation Report publishing.
## Requirements
### Requirement: Review gate

The system SHALL require explicit user acceptance before writing to the Deliverables List.

#### Scenario: Accept creates list item

- **GIVEN** an agent proposal thread with Accept/Edit/Reject buttons
- **WHEN** a user clicks Accept (all or selected)
- **THEN** Deliverables List rows SHALL be created with the core schema fields
- **AND** default status SHALL be "Not started" or "Needs clarification" if flagged

#### Scenario: Reject does not write

- **GIVEN** an agent proposal thread
- **WHEN** a user clicks Reject
- **THEN** no Deliverables List rows SHALL be created

#### Scenario: No write without interaction

- **GIVEN** agent proposals displayed in a thread
- **WHEN** no Accept/Edit/Reject button is clicked
- **THEN** the Deliverables List SHALL remain unchanged

### Requirement: Deliverable list schema

Deliverables List rows SHALL use the mandatory core fields. The list column schema SHALL be defined in `slack-app/content/lists/deliverables.json` with stable column `key` values. Status select options SHALL reference `@domain/deliverable-statuses`. The schema SHALL include an **Open questions** column used as a source field for Situation Report publishing.

#### Scenario: Core fields populated

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** the list row is created
- **THEN** Task ID, Assignee, Status, Situation, Category, Requirements, Due date, Deliverable, and Open questions fields SHALL be populated per schema

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

### Requirement: Requirements canvas promotion

On acceptance, the Requirements canvas SHALL mark promoted candidates.

#### Scenario: Candidate promoted on accept

- **GIVEN** deliverable candidates listed in the Requirements canvas
- **WHEN** a user accepts corresponding proposals
- **THEN** those candidates SHALL be marked as promoted in the Requirements canvas

### Requirement: On-demand delivery template canvas

Delivery Template Canvases SHALL be created only on demand, not pre-created for empty rows.

#### Scenario: Canvas created on accept

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** delivery canvas creation is triggered
- **THEN** a Delivery Template Canvas SHALL be created pre-filled from Requirements canvas and proposal
- **AND** its URL SHALL be linked in the Deliverables List Deliverable field

#### Scenario: No canvas for empty rows

- **GIVEN** a Deliverables List row without an accepted deliverable
- **WHEN** no explicit creation action occurs
- **THEN** no Delivery Template Canvas SHALL exist for that row

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

