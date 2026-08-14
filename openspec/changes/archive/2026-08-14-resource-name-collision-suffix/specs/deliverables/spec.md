## ADDED Requirements

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

## MODIFIED Requirements

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
