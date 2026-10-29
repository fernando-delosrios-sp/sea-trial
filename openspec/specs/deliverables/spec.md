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

Deliverables List rows SHALL use the mandatory core fields. The list column schema SHALL be defined in `slack-app/content/lists/deliverables.json` with stable column `key` values. Status select options SHALL reference `@domain/deliverable-statuses`. The schema SHALL include a **Requirement Ref** column (`requirement_ref`) linking to the parent `REQ-XX` identifier in the Requirements Canvas, and an **Open questions** column used as a source field for Situation Report publishing.

#### Scenario: Core fields populated

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** the list row is created
- **THEN** Task ID, Requirement Ref, Assignee, Status, Situation, Category, Requirements, Due date, Deliverable, and Open questions fields SHALL be populated per schema

---

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

Situation Report deliverable detail blocks SHALL include a **Delivery excerpt** subsection sourced from the linked Delivery Template Canvas `## Customer summary` section when the canvas exists and the review flag is cleared. When the canvas is missing or review is pending, the subsection SHALL display configured fallback copy. The Deliverable link field SHALL still appear when present on the list row.

#### Scenario: Delivery excerpt not populated at MVP

- **GIVEN** a deliverable with a linked Delivery Template Canvas that has review flag set or no Customer summary content
- **WHEN** Publish situation report runs
- **THEN** the Delivery excerpt subsection SHALL display configured fallback copy
- **AND** the Deliverable link field SHALL still appear when present on the list row

#### Scenario: Delivery excerpt from Customer summary

- **GIVEN** a deliverable with a linked reviewed Delivery Template Canvas containing a Customer summary section
- **WHEN** Publish situation report runs
- **THEN** the Delivery excerpt subsection SHALL contain text from Customer summary
- **AND** the excerpt SHALL NOT exceed 500 characters unless truncated with ellipsis
- **AND** one hero link from Visual proof MAY be appended when present

#### Scenario: Delivery excerpt when review pending

- **GIVEN** a deliverable with a linked Delivery Template Canvas with review flag set
- **WHEN** Publish situation report runs
- **THEN** the Delivery excerpt subsection SHALL display fallback copy indicating delivery draft pending review
- **AND** the Deliverable link field SHALL still appear when present on the list row

#### Scenario: Delivery excerpt when canvas missing

- **GIVEN** a deliverable with no linked Delivery Template Canvas
- **WHEN** Publish situation report runs
- **THEN** the Delivery excerpt subsection SHALL display fallback copy indicating pending delivery canvas structure
- **AND** the Deliverable link field SHALL still appear when present on the list row

### Requirement: Requirements canvas promotion

On acceptance, the Requirements canvas SHALL mark promoted candidates.

#### Scenario: Candidate promoted on accept

- **GIVEN** deliverable candidates listed in the Requirements canvas
- **WHEN** a user accepts corresponding proposals
- **THEN** those candidates SHALL be marked as promoted in the Requirements canvas

### Requirement: Validation required canvas creation

The system SHALL create a Delivery Template Canvas when a Deliverables List row status first transitions to **Validation required**. Creation SHALL link the canvas URL in the list **Deliverable** field and invoke the delivery agent to produce draft version 1. Canvas display titles SHALL be disambiguated on workspace name collision per the Delivery canvas title disambiguation requirement.

#### Scenario: Canvas created on Validation required

- **GIVEN** a Deliverables List row with no linked Deliverable and status **In progress**
- **WHEN** the row status changes to **Validation required**
- **THEN** a Delivery Template Canvas SHALL be created for that task ID
- **AND** the Deliverable field SHALL be populated with the canvas link
- **AND** the delivery agent SHALL run to produce draft version 1

#### Scenario: No canvas before Validation required

- **GIVEN** a Deliverables List row created on Accept with status **Not started**
- **WHEN** no transition to **Validation required** has occurred
- **THEN** no Delivery Template Canvas SHALL exist for that row
- **AND** the Deliverable field SHALL be empty

### Requirement: Manual delivery consolidation

The system SHALL support manual re-consolidation of a Delivery Template Canvas via a **Consolidate draft** canvas action. Consolidation SHALL invoke the delivery agent with the current list row and canvas content as input.

#### Scenario: Consolidate draft invokes agent

- **GIVEN** a Delivery Template Canvas linked to a Deliverables List row
- **WHEN** a user triggers **Consolidate draft**
- **THEN** the delivery agent SHALL be invoked with the list row and current canvas markdown
- **AND** the canvas SHALL be updated with the agent output

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

### Requirement: Verification agent trigger on validation or acceptance

The system SHALL trigger the Verification Agent workflow when a Deliverables List row status first transitions to **Validation required** or **Accepted**. The workflow SHALL prompt the assigned Tech Specialist in the deliverable thread to provide visual proof links, configuration notes, and an outcome summary. The system SHALL NOT create an independent Slack canvas for the deliverable.

#### Scenario: Prompt triggered on validation required

- **GIVEN** a Deliverables List row with status **In progress**
- **WHEN** the row status changes to **Validation required**
- **THEN** the Verification Agent SHALL initiate a thread conversation prompting for visual proof and outcome summary
- **AND** no new Slack canvas SHALL be created in the workspace

#### Scenario: No separate canvas created on accept

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** the Deliverables List row is created or accepted
- **THEN** no standalone Delivery Template Canvas SHALL exist or be provisioned for that row

### Requirement: Delivery proof synchronization to requirements canvas

Upon receiving verified proof from the Tech Specialist, the Verification Agent SHALL format and write a `### Delivery Proof & Outcome` block directly into the parent requirement section in the Requirements Canvas matching `requirement_ref`.

#### Scenario: Proof written to parent requirement

- **GIVEN** a deliverable with `requirement_ref: REQ-01`
- **WHEN** the Verification Agent receives visual proof and config notes
- **THEN** the Requirements Canvas SHALL be updated with a `### Delivery Proof & Outcome` subsection under `## REQ-01`
- **AND** the requirement status in the canvas SHALL be updated to `Complete`

---
