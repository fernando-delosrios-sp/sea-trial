# Event Channel

## Purpose

Provisioning and seeding of TES Event Channels and their Slack-native objects.

## Requirements

### Requirement: TES event channel provisioning

The system SHALL allow a TES team member to create a new TES Event Channel via a global
shortcut, collecting a custom project name and optional pasted context.

#### Scenario: Successful channel creation

- **GIVEN** a TES user invokes the "Create TES Event" global shortcut
- **WHEN** they submit a valid project name
- **THEN** a channel named `#proj-{slug(projectName)}-tes` SHALL be created
- **AND** the trigger user and specified AE/SE users SHALL be invited

#### Scenario: Invalid project name

- **GIVEN** a TES user invokes the provisioning shortcut
- **WHEN** the project name cannot produce a valid Slack channel slug
- **THEN** the system SHALL reject the submission with a clear error message

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects and post a pinned index.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel has been provisioned
- **WHEN** seeding completes
- **THEN** Dashboard, Requirements, and Infrastructure canvases SHALL exist
- **AND** Deliverables and Incidents lists SHALL exist with core column schemas
- **AND** object IDs SHALL be stored in Dashboard canvas metadata as `TesEventContext`
- **AND** a pinned index message SHALL link all objects with an onboarding CTA

#### Scenario: Metadata round-trip

- **GIVEN** a seeded Dashboard canvas with `TesEventContext` metadata
- **WHEN** the slack-app reads the metadata block
- **THEN** all object IDs and onboarding state SHALL deserialize correctly

### Requirement: Canvas and list helpers

The slack-app SHALL expose reusable helpers for canvas and list operations.

#### Scenario: Create canvas

- **GIVEN** a channel ID, title, and markdown content
- **WHEN** `createCanvas` is invoked
- **THEN** a new canvas SHALL be created and its ID returned

#### Scenario: Update canvas section

- **GIVEN** an existing canvas with a section marker
- **WHEN** `updateCanvasSection` is invoked with new markdown
- **THEN** only the targeted section SHALL be updated
