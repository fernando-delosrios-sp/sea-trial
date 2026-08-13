# event-channel Delta Spec

## ADDED Requirements

### Requirement: List channel attachment on seed

On TES Event Channel seeding, Deliverables and Incidents lists SHALL be attached
to the channel as visible channel objects — native Slack list tabs when the
platform supports programmatic attachment, or bookmarks with list deep links when
documented as the supported fallback in `design.md`.

#### Scenario: Deliverables list tab on new channel

- **GIVEN** a TES Event Channel is provisioned and seeding completes successfully
- **WHEN** the channel's tab metadata is inspected (e.g. `conversations.info`
  `properties.tabs` or approved fallback surface)
- **THEN** a Deliverables list object SHALL be attached to the channel
- **AND** the attached object SHALL reference the same list ID stored in
  `TesEventContext.deliverablesListId`

#### Scenario: Incidents list tab on new channel

- **GIVEN** a TES Event Channel is provisioned and seeding completes successfully
- **WHEN** the channel's tab metadata is inspected
- **THEN** an Incidents list object SHALL be attached to the channel
- **AND** the attached object SHALL reference the same list ID stored in
  `TesEventContext.incidentsListId`

#### Scenario: List attachment does not block seed completion

- **GIVEN** list creation and channel access grant succeed
- **WHEN** list channel attachment runs
- **THEN** seeding SHALL fail with a clear error if attachment fails
- **AND** partial channels without attached lists SHALL NOT be reported as
  successfully seeded

## MODIFIED Requirements

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects by executing
the channel composition manifest for `tes-event`, write creation fields to the
Dashboard `## Project` section, and post a pinned index with an onboarding button.
Canvas, list, and message content SHALL be loaded from declarative content files
under `slack-app/content/`, not inline TypeScript templates. Object IDs SHALL be
mapped to named slots in the composition manifest and bridged to flat
`TesEventContext` fields via `runtime.context_slot_map`. Seeding SHALL include a
Situation Report canvas initialized from `situation-report.hbs.md`.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel has been provisioned
- **WHEN** seeding completes via the channel provisioner
- **THEN** Dashboard, Requirements, Infrastructure, and Situation Report canvases
  SHALL exist
- **AND** Deliverables and Incidents lists SHALL exist with core column schemas
  from list JSON
- **AND** Deliverables and Incidents lists SHALL be attached to the channel as
  visible channel objects per the List channel attachment requirement
- **AND** object IDs SHALL be stored in Dashboard canvas metadata as
  `TesEventContext`
- **AND** a pinned index message SHALL link all objects with a Complete onboarding
  button
- **AND** `TesEventContext` SHALL contain `situationReportCanvasId`
- **AND** `TesEventContext` MAY include optional `channelType` and
  `compositionVersion` from the manifest

#### Scenario: Metadata round-trip

- **GIVEN** a seeded Dashboard canvas with `TesEventContext` metadata
- **WHEN** the slack-app reads the metadata block
- **THEN** all object IDs, accountName, salesforceOpportunityUrl, memberUserIds,
  contextNotes, onboarding state, and optional composition fields SHALL
  deserialize correctly

#### Scenario: Composition-driven provisioning order

- **GIVEN** the tes-event composition manifest declares resource slots for
  canvases and lists
- **WHEN** channel seeding runs
- **THEN** all composition resources SHALL be created in manifest provisioning
  order
- **AND** Dashboard metadata SHALL embed all peer object IDs after finalize
