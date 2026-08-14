## MODIFIED Requirements

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects by executing the channel composition manifest for `tes-event`, write creation fields to the Dashboard `## Project` section, and post a pinned index with an onboarding button. Canvas, list, and message content SHALL be loaded from declarative content files under `slack-app/content/`, not inline TypeScript templates. Object IDs SHALL be mapped to step `id` values in the composition manifest and bridged to flat `TesEventContext` fields by the provisioner. Seeding SHALL include a Situation Report canvas initialized from `situation-report.hbs.md`. Display names for created canvases and lists SHALL be disambiguated per the Unique display names on provision collision requirement when workspace name collisions occur; manifest step `id` values and context field mapping SHALL remain unchanged regardless of suffix. Workflow steps with `bookmark: true` SHALL surface via the shared deploy-time trigger and channel-scoped permissions, not per-channel trigger creation.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel has been provisioned
- **WHEN** seeding completes via the channel provisioner
- **THEN** Dashboard, Requirements, Infrastructure, and Situation Report canvases SHALL exist
- **AND** Deliverables and Incidents lists SHALL exist with core column schemas from list JSON
- **AND** Deliverables and Incidents lists with `bookmark: true` SHALL be attached to the channel as header bookmarks per the List channel attachment requirement
- **AND** the onboarding workflow step with `bookmark: true` SHALL be associated with the channel Workflows tab without creating a duplicate global shortcut per channel
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
