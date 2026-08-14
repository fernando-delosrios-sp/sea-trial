## ADDED Requirements

### Requirement: Unique display names on provision collision

When creating a Slack canvas, list, or channel bookmark during TES Event Channel seeding, the system SHALL NOT retry creation with the same display name after Slack reports a name collision. The system SHALL append numeric suffixes `-1`, `-2`, … to the base display name until creation succeeds or a configured retry limit is reached.

#### Scenario: Canvas title collision on seed

- **GIVEN** a canvas step requests title `Dashboard`
- **AND** a workspace canvas titled `Dashboard` already exists
- **WHEN** channel seeding creates the canvas
- **THEN** the system SHALL create the canvas with title `Dashboard-1` (or the next available suffix)
- **AND** seeding SHALL complete successfully with the new canvas ID stored in `TesEventContext`

#### Scenario: List name collision on seed

- **GIVEN** a list step resolves display name `Acme Deliverables`
- **AND** a Slack List with that name already exists in the workspace
- **WHEN** channel seeding creates the list
- **THEN** the system SHALL create the list with name `Acme Deliverables-1` (or the next available suffix)
- **AND** a bookmark step with `bookmark: true` SHALL use the same allocated list display name

#### Scenario: Base name used when no collision

- **GIVEN** no existing Slack object uses the requested display name
- **WHEN** channel seeding creates the resource
- **THEN** the system SHALL use the base display name without a suffix

#### Scenario: Retry limit exhausted

- **GIVEN** display names `Title`, `Title-1`, … through the retry limit are all taken
- **WHEN** channel seeding attempts to create the resource
- **THEN** the system SHALL fail with an error identifying the base name and collision exhaustion
- **AND** seeding SHALL NOT report partial success as complete

## MODIFIED Requirements

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects by executing the channel composition manifest for `tes-event`, write creation fields to the Dashboard `## Project` section, and post a pinned index with an onboarding button. Canvas, list, and message content SHALL be loaded from declarative content files under `slack-app/content/`, not inline TypeScript templates. Object IDs SHALL be mapped to step `id` values in the composition manifest and bridged to flat `TesEventContext` fields by the provisioner. Seeding SHALL include a Situation Report canvas initialized from `situation-report.hbs.md`. Display names for created canvases and lists SHALL be disambiguated per the Unique display names on provision collision requirement when workspace name collisions occur; manifest step `id` values and context field mapping SHALL remain unchanged regardless of suffix.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel has been provisioned
- **WHEN** seeding completes via the channel provisioner
- **THEN** Dashboard, Requirements, Infrastructure, and Situation Report canvases SHALL exist
- **AND** Deliverables and Incidents lists SHALL exist with core column schemas from list JSON
- **AND** Deliverables and Incidents lists with `bookmark: true` SHALL be attached to the channel as bookmarks per the List channel attachment requirement
- **AND** object IDs SHALL be stored in Dashboard canvas metadata as `TesEventContext`
- **AND** a pinned index message SHALL link all titled steps with a Complete onboarding button
- **AND** `TesEventContext` SHALL contain `situationReportCanvasId`
- **AND** `TesEventContext` MAY include optional `channelType` and `compositionVersion` from the manifest

#### Scenario: Metadata round-trip

- **GIVEN** a seeded Dashboard canvas with `TesEventContext` metadata
- **WHEN** the slack-app reads the metadata block
- **THEN** all object IDs, accountName, salesforceOpportunityUrl, memberUserIds, contextNotes, onboarding state, and optional composition fields SHALL deserialize correctly

#### Scenario: Composition-driven provisioning order

- **GIVEN** the tes-event composition manifest declares ordered `steps` for canvases, lists, and workflows
- **WHEN** channel seeding runs
- **THEN** all composition steps SHALL be executed in manifest `steps` order
- **AND** Dashboard metadata SHALL embed all peer object IDs after finalize
