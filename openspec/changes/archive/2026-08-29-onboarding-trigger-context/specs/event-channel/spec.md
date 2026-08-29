## MODIFIED Requirements

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects by executing the channel composition manifest for `tes-event`, write creation fields to the Dashboard `## Project` section, write the Onboarding Link Trigger share URL into the Dashboard `## Onboarding` section while onboarding is incomplete, and post a pinned index with an onboarding button whose value carries a trigger context snapshot. Canvas, list, and message content SHALL be loaded from declarative content files under `slack-app/content/`, not inline TypeScript templates. Object IDs SHALL be mapped to step `id` values in the composition manifest and bridged to flat `TesEventContext` fields by the provisioner. Seeding SHALL include a Situation Report canvas initialized from `situation-report.hbs.md`. Display names for created canvases and lists SHALL be disambiguated per the Unique display names on provision collision requirement when workspace name collisions occur; manifest step `id` values and context field mapping SHALL remain unchanged regardless of suffix. A workflow step with `link` `open_onboarding_workflow` SHALL create a per-channel Onboarding Link Trigger with baked channel ID, Dashboard canvas ID, and compact JSON `TesEventContext` snapshot; seeding SHALL NOT associate onboarding with the channel Workflows tab via `bookmark` or `featured` flags. If the pinned index Complete onboarding button `value` would exceed 2000 characters, seeding SHALL fail rather than omit the snapshot.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel has been provisioned
- **WHEN** seeding completes via the channel provisioner
- **THEN** Dashboard, Requirements, Infrastructure, and Situation Report canvases SHALL exist
- **AND** Deliverables and Incidents lists SHALL exist with core column schemas from list JSON
- **AND** Deliverables and Incidents lists with `bookmark: true` SHALL be attached to the channel as header bookmarks per the List channel attachment requirement
- **AND** a per-channel Onboarding Link Trigger named `Complete Onboarding ({channelId})` SHALL exist with baked `channel_id`, `dashboard_canvas_id`, and a compact JSON `TesEventContext` snapshot
- **AND** the Dashboard canvas SHALL include a Complete onboarding markdown link using that trigger's share URL
- **AND** object IDs SHALL be stored in Dashboard canvas metadata as `TesEventContext`
- **AND** a pinned index message SHALL link all titled steps with a Complete onboarding button whose value includes that snapshot
- **AND** `TesEventContext` SHALL contain `situationReportCanvasId`
- **AND** `TesEventContext` MAY include optional `channelType` and `compositionVersion` from the manifest

#### Scenario: Metadata round-trip

- **GIVEN** a seeded Dashboard canvas with `TesEventContext` metadata
- **WHEN** `deserializeEventContext` is applied to the metadata string the provisioner wrote
- **THEN** all object IDs, accountName, salesforceOpportunityUrl, memberUserIds, contextNotes, onboarding state, and optional composition fields SHALL deserialize correctly

#### Scenario: Composition-driven provisioning order

- **GIVEN** the tes-event composition manifest declares ordered `steps` for canvases, lists, and workflows
- **WHEN** channel seeding runs
- **THEN** all composition steps SHALL be executed in manifest `steps` order
- **AND** Dashboard metadata SHALL embed all peer object IDs after finalize

#### Scenario: Oversized pinned button snapshot fails seed

- **GIVEN** a `TesEventContext` whose compact JSON in the pinned Complete onboarding button value would exceed 2000 characters
- **WHEN** seeding posts the pinned index
- **THEN** seeding SHALL fail with a clear error
- **AND** the button value SHALL NOT be truncated to drop the snapshot
