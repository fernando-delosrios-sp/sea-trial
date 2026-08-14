## MODIFIED Requirements

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects by executing the channel composition manifest for `tes-event`, write creation fields to the Dashboard `## Project` section, and post a pinned index with an onboarding button. Canvas, list, and message content SHALL be loaded from declarative content files under `slack-app/content/`, not inline TypeScript templates. Object IDs SHALL be mapped to step `id` values in the composition manifest and bridged to flat `TesEventContext` fields by the provisioner. Seeding SHALL include a Situation Report canvas initialized from `situation-report.hbs.md`.

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

### Requirement: List channel attachment on seed

On TES Event Channel seeding, list steps with `bookmark: true` SHALL add channel bookmarks with list deep links after list creation. Native Slack list channel tabs SHALL NOT be required when the platform does not expose a supported list-tab API.

#### Scenario: Deliverables list tab on new channel

- **GIVEN** a TES Event Channel is provisioned and seeding completes successfully
- **WHEN** the channel bookmarks are inspected
- **THEN** a Deliverables bookmark SHALL link to the list stored in `TesEventContext.deliverablesListId`

#### Scenario: Incidents list tab on new channel

- **GIVEN** a TES Event Channel is provisioned and seeding completes successfully
- **WHEN** the channel bookmarks are inspected
- **THEN** an Incidents bookmark SHALL link to the list stored in `TesEventContext.incidentsListId`

#### Scenario: List attachment does not block seed completion

- **GIVEN** list creation and channel access grant succeed
- **WHEN** list bookmark attachment runs for a step with `bookmark: true`
- **THEN** seeding SHALL fail with a clear error if bookmark attachment fails
- **AND** partial channels without attached bookmarks SHALL NOT be reported as successfully seeded
