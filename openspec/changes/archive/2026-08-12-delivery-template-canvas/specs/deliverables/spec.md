## ADDED Requirements

### Requirement: Validation required canvas creation

The system SHALL create a Delivery Template Canvas when a Deliverables List row status first transitions to **Validation required**. Creation SHALL link the canvas URL in the list **Deliverable** field and invoke the delivery agent to produce draft version 1.

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

## MODIFIED Requirements

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
