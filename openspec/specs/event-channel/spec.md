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

