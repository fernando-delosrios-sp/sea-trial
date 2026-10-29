## MODIFIED Requirements

### Requirement: Unique display names on provision collision

When creating a Slack canvas, list, or channel bookmark during TES Event Channel seeding, the system SHALL NOT retry creation with the same display name after Slack reports a name collision. The system SHALL append numeric suffixes `1`, `2`, … to the suffixed base display name until creation succeeds or a configured retry limit is reached.

#### Scenario: Canvas title collision on seed

- **GIVEN** a canvas step requests title `Dashboard` in channel `proj-acme-tes`
- **AND** a workspace canvas titled `Dashboard [proj-acme-tes]` already exists
- **WHEN** channel seeding creates the canvas
- **THEN** the system SHALL create the canvas with title `Dashboard [proj-acme-tes]1` (or the next available suffix)
- **AND** seeding SHALL complete successfully with the new canvas ID stored in `TesEventContext`

#### Scenario: List name collision on seed

- **GIVEN** a list step resolves display name `Deliverables [proj-acme-tes]`
- **AND** a Slack List with that name already exists in the workspace
- **WHEN** channel seeding creates the list
- **THEN** the system SHALL create the list with name `Deliverables [proj-acme-tes]1` (or the next available suffix)
- **AND** a bookmark step with `bookmark: true` SHALL use the clean base title `Deliverables`

#### Scenario: Base name used when no collision

- **GIVEN** no existing Slack object uses the requested display name `Dashboard [proj-acme-tes]`
- **WHEN** channel seeding creates the resource
- **THEN** the system SHALL use the suffixed display name `Dashboard [proj-acme-tes]` without a numeric suffix

#### Scenario: Retry limit exhausted

- **GIVEN** display names `Title [channel]`, `Title [channel]1`, … through the retry limit are all taken
- **WHEN** channel seeding attempts to create the resource
- **THEN** the system SHALL fail with an error identifying the base name and collision exhaustion
- **AND** seeding SHALL NOT report partial success as complete

---

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects by executing the channel composition manifest for `tes-event`, write creation fields to the Dashboard `## Project` section, and post a pinned index with direct links to each artifact. Canvas, list, and message content SHALL be loaded from declarative content files under `slack-app/content/`, not inline TypeScript templates. Object IDs SHALL be mapped to step `id` values in the composition manifest and bridged to flat `TesEventContext` fields by the provisioner. Seeding SHALL include a Situation Report canvas initialized from `situation-report.hbs.md`. All created canvases and lists SHALL be titled with the channel name appended as a suffix in brackets (`<Base Title> [<channel-name>]`). All created canvases SHALL be explicitly granted channel-scoped write access via `canvases.access.set` with `channel_ids: [channelId]`, ensuring current and newly joining members inherit edit permissions. Channel bookmarks and the pinned index SHALL display clean base titles without the channel suffix. Display names for created canvases and lists SHALL be disambiguated per the Unique display names on provision collision requirement when workspace name collisions occur; manifest step `id` values and context field mapping SHALL remain unchanged regardless of suffix.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel `#proj-acme-tes` has been provisioned
- **WHEN** seeding completes via the channel provisioner
- **THEN** Dashboard, Requirements, Infrastructure, and Situation Report canvases SHALL exist with titles suffixed by `[proj-acme-tes]`
- **AND** each provisioned canvas SHALL have channel-scoped write access granted via `canvases.access.set` for channel `#proj-acme-tes`
- **AND** Deliverables and Incidents lists SHALL exist with titles suffixed by `[proj-acme-tes]`
- **AND** Deliverables and Incidents lists with `bookmark: true` SHALL be attached to the channel as header bookmarks displaying clean titles `Deliverables` and `Incidents`
- **AND** a pinned index message SHALL link all titled steps using clean base titles
- **AND** `TesEventContext` SHALL contain all peer object IDs after finalize

#### Scenario: Snapshot round-trip

- **GIVEN** a seeded TES Event Channel with a compact `TesEventContext` snapshot
- **WHEN** the slack-app deserializes that snapshot
- **THEN** all object IDs, accountName, salesforceOpportunityUrl, memberUserIds, contextNotes, onboarding state, and optional composition fields SHALL deserialize correctly

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

---

### Requirement: Canvas and list helpers

The slack-app SHALL expose reusable helpers for canvas and list operations, including canvas creation, canvas channel access management, and section updates.

#### Scenario: Create canvas

- **GIVEN** a channel ID, title, and markdown content
- **WHEN** `createCanvas` is invoked
- **THEN** a new canvas SHALL be created and its ID returned

#### Scenario: Grant channel access to canvas

- **GIVEN** a canvas ID, channel ID, and access level `write`
- **WHEN** `setCanvasChannelAccess` is invoked
- **THEN** `canvases.access.set` SHALL be called with `channel_ids: [channelId]` and `access_level: "write"`
- **AND** members of the channel SHALL inherit edit permissions

#### Scenario: Update canvas section

- **GIVEN** an existing canvas with a section marker
- **WHEN** `updateCanvasSection` is invoked with new markdown
- **THEN** only the targeted section SHALL be updated
