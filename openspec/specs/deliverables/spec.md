# Deliverables

## Purpose

Review gate, Deliverables List writes, and on-demand Delivery Template Canvas creation.

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

Deliverables List rows SHALL use the mandatory core fields.

#### Scenario: Core fields populated

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** the list row is created
- **THEN** Task ID, Assignee, Status, Situation, Category, Requirements, Due date, and Deliverable fields SHALL be populated per schema

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
