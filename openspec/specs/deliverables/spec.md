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

### Requirement: On-demand delivery template canvas

Delivery Template Canvases SHALL be created when a Deliverables List row status first reaches **Validation required**, not on Accept. Canvases SHALL follow the canonical section structure defined in the Delivery canvas template. The Deliverable list field SHALL remain empty until canvas creation. Canvases SHALL NOT be pre-created for rows without an accepted deliverable.

#### Scenario: Canvas created on accept

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** the list row is created
- **THEN** no Delivery Template Canvas SHALL be created
- **AND** the Deliverable field SHALL remain empty until status reaches Validation required

#### Scenario: Canvas not created on accept

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** the list row is created
- **THEN** the Deliverable field SHALL be empty
- **AND** no Delivery Template Canvas SHALL be created

#### Scenario: Canvas linked after Validation required

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** the row status later reaches **Validation required**
- **THEN** a Delivery Template Canvas SHALL be created and linked
- **AND** the canvas SHALL be pre-filled by the delivery agent per the delivery agent spec

#### Scenario: No canvas for empty rows

- **GIVEN** a Deliverables List row without an accepted deliverable
- **WHEN** no explicit creation action occurs
- **THEN** no Delivery Template Canvas SHALL exist for that row

### Requirement: Delivery canvas title disambiguation

When creating a delivery canvas for an accepted deliverable, the system SHALL apply the same numeric suffix disambiguation policy as channel seeding when the requested canvas title collides with an existing workspace canvas title.

#### Scenario: Delivery canvas title collision

- **GIVEN** a deliverable row with task ID `TASK-42`
- **AND** a canvas titled `Delivery: TASK-42` already exists in the workspace
- **WHEN** the delivery canvas orchestrator creates a new canvas for that row
- **THEN** the system SHALL create the canvas with title `Delivery: TASK-42-1` (or the next available suffix)
- **AND** the deliverable list item SHALL reference the newly created canvas ID

#### Scenario: Delivery canvas uses base title when available

- **GIVEN** no canvas exists with title `Delivery: TASK-42`
- **WHEN** the delivery canvas orchestrator creates a canvas for task `TASK-42`
- **THEN** the canvas title SHALL be `Delivery: TASK-42` without a suffix

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

### Requirement: Delivery canvas review flag

After each delivery agent consolidation, the Delivery Template Canvas SHALL display a canvas-level review banner and per-section agent-generated markers on all agent-touched standard sections. The review flag SHALL be cleared only by an explicit **Mark reviewed** action.

#### Scenario: Review flag set after agent run

- **GIVEN** a Delivery Template Canvas exists for a deliverable
- **WHEN** the delivery agent completes a consolidation run
- **THEN** the canvas metadata SHALL include an agent-draft pending review banner
- **AND** each agent-touched standard section SHALL include an agent-generated marker

#### Scenario: Review flag cleared manually

- **GIVEN** a Delivery Template Canvas with review flag set
- **WHEN** a user triggers **Mark reviewed**
- **THEN** the review banner SHALL be removed
- **AND** all section agent-generated markers SHALL be removed

#### Scenario: Review flag reappears on re-consolidation

- **GIVEN** a reviewed Delivery Template Canvas
- **WHEN** a user triggers **Consolidate draft**
- **THEN** the review flag SHALL be set again
- **AND** the Draft version integer SHALL increment

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

