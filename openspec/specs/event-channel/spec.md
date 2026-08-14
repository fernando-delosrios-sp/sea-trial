# Event Channel

## Purpose

Provisioning and seeding of TES Event Channels and their Slack-native objects.
## Requirements
### Requirement: TES event channel provisioning

The system SHALL allow a TES team member to create a new TES Event Channel via a shortcut that opens a creation modal, collecting project name, Account, Salesforce opportunity URL, initial members, and optional context notes. The shortcut SHALL be installed automatically when the slack-app is deployed via CI/CD. By default the shortcut SHALL be a global (workspace-wide) shortcut; channel-scoped installation MAY be configured for designated channels only.

#### Scenario: Successful channel creation

- **GIVEN** a TES user invokes the "Create TES Event" shortcut and submits a valid creation modal
- **WHEN** the workflow completes
- **THEN** a channel named `#proj-{slug(projectName)}-tes` SHALL be created
- **AND** all members selected in the creation modal SHALL be invited
- **AND** the trigger user SHALL be invited if not already in the member list

#### Scenario: Channel slug suffix when base name unavailable

- **GIVEN** a user submits project name `Acme`
- **AND** `#proj-acme-tes` is reserved but not available to reuse (e.g. deleted channel)
- **WHEN** the provisioning workflow creates the channel
- **THEN** the system SHALL create `#proj-acme1-tes` (or the next available numeric suffix before `-tes`)
- **AND** the workflow output `channel_name` SHALL reflect the created name

#### Scenario: Invalid project name

- **GIVEN** a TES user invokes the provisioning shortcut
- **WHEN** the project name cannot produce a valid Slack channel slug
- **THEN** the system SHALL reject the submission with a clear error message

#### Scenario: Shortcut available after CI deploy

- **GIVEN** the slack-app has been deployed via GitHub Actions
- **WHEN** a TES user opens Slack shortcuts in the workspace
- **THEN** the "Create TES Event" shortcut SHALL be available without manual trigger installation

#### Scenario: Channel-scoped shortcut when configured

- **GIVEN** trigger config sets `create_tes_event` scope to `channel` with channel ID `C01234567`
- **WHEN** a TES user is in channel `C01234567` and opens channel shortcuts
- **THEN** the "Create TES Event" shortcut SHALL be available in that channel
- **AND** the shortcut SHALL NOT be required to appear as a global shortcut

---

### Requirement: Deploy-time shortcut installation

The "Create TES Event" shortcut trigger SHALL be provisioned as part of the standard deploy pipeline, not as a separate manual post-deploy step.

#### Scenario: No manual trigger create after deploy

- **GIVEN** an operator runs the GitHub Actions Deploy workflow
- **WHEN** the workflow succeeds
- **THEN** the "Create TES Event" trigger SHALL already be installed
- **AND** README and smoke checklist SHALL NOT require manual `slack trigger create` for MVP smoke testing

---

### Requirement: Unique display names on provision collision

When creating a Slack canvas, list, or channel bookmark during TES Event Channel seeding, the system SHALL NOT retry creation with the same display name after Slack reports a name collision. The system SHALL append numeric suffixes `1`, `2`, … to the base display name until creation succeeds or a configured retry limit is reached.

#### Scenario: Canvas title collision on seed

- **GIVEN** a canvas step requests title `Dashboard`
- **AND** a workspace canvas titled `Dashboard` already exists
- **WHEN** channel seeding creates the canvas
- **THEN** the system SHALL create the canvas with title `Dashboard1` (or the next available suffix)
- **AND** seeding SHALL complete successfully with the new canvas ID stored in `TesEventContext`

#### Scenario: List name collision on seed

- **GIVEN** a list step resolves display name `Acme Deliverables`
- **AND** a Slack List with that name already exists in the workspace
- **WHEN** channel seeding creates the list
- **THEN** the system SHALL create the list with name `Acme Deliverables1` (or the next available suffix)
- **AND** a bookmark step with `bookmark: true` SHALL use the same allocated list display name

#### Scenario: Base name used when no collision

- **GIVEN** no existing Slack object uses the requested display name
- **WHEN** channel seeding creates the resource
- **THEN** the system SHALL use the base display name without a suffix

#### Scenario: Retry limit exhausted

- **GIVEN** display names `Title`, `Title1`, … through the retry limit are all taken
- **WHEN** channel seeding attempts to create the resource
- **THEN** the system SHALL fail with an error identifying the base name and collision exhaustion
- **AND** seeding SHALL NOT report partial success as complete

---

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

### Requirement: Creation modal

The system SHALL present a creation modal when a TES user invokes the "Create TES Event" global shortcut, collecting project name, Account, Salesforce opportunity URL, initial channel members, and optional context notes.

#### Scenario: Open creation modal

- **GIVEN** a TES user invokes the "Create TES Event" global shortcut
- **WHEN** the shortcut interactivity is received
- **THEN** a modal SHALL open with fields for project name, Account, Salesforce opportunity URL, initial members (multi-user select), and optional context notes

#### Scenario: Submit valid creation form

- **GIVEN** a user completes the creation modal with a valid project name and at least one selected member
- **WHEN** they submit the form
- **THEN** the create TES event workflow SHALL run with all submitted values
- **AND** a TES Event Channel SHALL be provisioned and seeded

#### Scenario: Reject invalid project name at creation

- **GIVEN** a user submits a project name that cannot produce a valid Slack channel slug
- **WHEN** validation runs
- **THEN** the submission SHALL be rejected with a clear error message
- **AND** no channel SHALL be created

---

### Requirement: Creation context on dashboard

The system SHALL write creation-time fields to the Dashboard canvas `## Project` section immediately after seeding completes.

#### Scenario: Project section populated at seed

- **GIVEN** a TES Event Channel has been provisioned and seeded
- **WHEN** seeding completes
- **THEN** the Dashboard canvas SHALL include a `## Project` section with project name, channel link, Account, Salesforce opportunity URL, member list, context notes (if provided), and onboarding status Pending

#### Scenario: Creation fields stored in context

- **GIVEN** a seeded TES Event Channel
- **WHEN** the Dashboard metadata is deserialized
- **THEN** `TesEventContext` SHALL include accountName, salesforceOpportunityUrl, memberUserIds, and contextNotes from the creation modal

---

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

