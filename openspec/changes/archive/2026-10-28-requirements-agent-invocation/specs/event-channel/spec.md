## MODIFIED Requirements

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects by executing the channel composition manifest for `tes-event`, write creation fields to the Dashboard `## Project` section, post and pin a Materials & Requirements Drop thread message, and post a pinned index with direct links to each artifact. Canvas, list, and message content SHALL be loaded from declarative content files under `slack-app/content/`, not inline TypeScript templates. Object IDs SHALL be mapped to step `id` values in the composition manifest and bridged to flat `TesEventContext` fields by the provisioner. Seeding SHALL include a Situation Report canvas initialized from `situation-report.hbs.md`. All created canvases and lists SHALL be titled with the channel name appended as a suffix in brackets (`<Base Title> [<channel-name>]`). All created canvases SHALL be explicitly granted channel-scoped write access via `canvases.access.set` with `channel_ids: [channelId]`, ensuring current and newly joining members inherit edit permissions. Channel bookmarks and the pinned index SHALL display clean base titles without the channel suffix. Display names for created canvases and lists SHALL be disambiguated per the Unique display names on provision collision requirement when workspace name collisions occur; manifest step `id` values and context field mapping SHALL remain unchanged regardless of suffix. The provisioner SHALL save the Materials & Requirements Drop message timestamp in `TesEventContext.materialsDropMessageTs`.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel `#proj-acme-tes` has been provisioned
- **WHEN** seeding completes via the channel provisioner
- **THEN** Dashboard, Requirements, Infrastructure, and Situation Report canvases SHALL exist with titles suffixed by `[proj-acme-tes]`
- **AND** each provisioned canvas SHALL have channel-scoped write access granted via `canvases.access.set` for channel `#proj-acme-tes`
- **AND** Deliverables and Incidents lists SHALL exist with titles suffixed by `[proj-acme-tes]`
- **AND** Deliverables and Incidents lists with `bookmark: true` SHALL be attached to the channel as header bookmarks displaying clean titles `Deliverables` and `Incidents`
- **AND** a pinned index message SHALL link all titled steps using clean base titles
- **AND** a pinned Materials & Requirements Drop message SHALL be posted to the channel
- **AND** `TesEventContext.materialsDropMessageTs` SHALL equal the timestamp of the pinned drop message
- **AND** `TesEventContext` SHALL contain all peer object IDs after finalize

#### Scenario: Snapshot round-trip

- **GIVEN** a seeded TES Event Channel with a compact `TesEventContext` snapshot
- **WHEN** the slack-app deserializes that snapshot
- **THEN** all object IDs, accountName, salesforceOpportunityUrl, memberUserIds, contextNotes, onboarding state, materialsDropMessageTs, and optional composition fields SHALL deserialize correctly

#### Scenario: Composition-driven provisioning order

- **GIVEN** the tes-event composition manifest declares ordered `steps` for canvases and lists
- **WHEN** channel seeding runs
- **THEN** all composition steps SHALL be executed in manifest `steps` order
- **AND** `TesEventContext` SHALL contain all peer object IDs after finalize

#### Scenario: Oversized pinned button snapshot fails seed

- **GIVEN** a `TesEventContext` whose compact JSON in the pinned index would exceed 2000 characters
- **WHEN** seeding posts the pinned index
- **THEN** seeding SHALL fail with a clear error
- **AND** the button value SHALL NOT be truncated to drop the snapshot
