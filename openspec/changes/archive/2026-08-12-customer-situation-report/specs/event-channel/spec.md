## MODIFIED Requirements

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects by executing the channel composition manifest for `tes-event`, write creation fields to the Dashboard `## Project` section, and post a pinned index with an onboarding button. Canvas, list, and message content SHALL be loaded from declarative content files under `slack-app/content/`, not inline TypeScript templates. Object IDs SHALL be mapped to named slots in the composition manifest and bridged to flat `TesEventContext` fields via `runtime.context_slot_map`. Seeding SHALL include a Situation Report canvas initialized from `situation-report.hbs.md`.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel has been provisioned
- **WHEN** seeding completes via the channel provisioner
- **THEN** Dashboard, Requirements, Infrastructure, and Situation Report canvases SHALL exist
- **AND** Deliverables and Incidents lists SHALL exist with core column schemas from list JSON
- **AND** object IDs SHALL be stored in Dashboard canvas metadata as `TesEventContext`
- **AND** a pinned index message SHALL link all objects with a Complete onboarding button
- **AND** `TesEventContext` SHALL contain `situationReportCanvasId`
- **AND** `TesEventContext` MAY include optional `channelType` and `compositionVersion` from the manifest

#### Scenario: Metadata round-trip

- **GIVEN** a seeded Dashboard canvas with `TesEventContext` metadata
- **WHEN** the slack-app reads the metadata block
- **THEN** all object IDs, accountName, salesforceOpportunityUrl, memberUserIds, contextNotes, onboarding state, and optional composition fields SHALL deserialize correctly

#### Scenario: Composition-driven provisioning order

- **GIVEN** the tes-event composition manifest declares `dashboard` depends on other resource slots
- **WHEN** channel seeding runs
- **THEN** Requirements, Infrastructure, Deliverables, Incidents, and Situation Report SHALL be created before Dashboard
- **AND** Dashboard metadata SHALL embed all peer object IDs
