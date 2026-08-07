## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: TES event channel provisioning

The system SHALL allow a TES team member to create a new TES Event Channel via a global shortcut that opens a creation modal, collecting project name, Account, Salesforce opportunity URL, initial members, and optional context notes.

#### Scenario: Successful channel creation

- **GIVEN** a TES user invokes the "Create TES Event" global shortcut and submits a valid creation modal
- **WHEN** the workflow completes
- **THEN** a channel named `#proj-{slug(projectName)}-tes` SHALL be created
- **AND** all members selected in the creation modal SHALL be invited
- **AND** the trigger user SHALL be invited if not already in the member list

#### Scenario: Invalid project name

- **GIVEN** a TES user invokes the provisioning shortcut
- **WHEN** the project name cannot produce a valid Slack channel slug
- **THEN** the system SHALL reject the submission with a clear error message

---

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects, write creation fields to the Dashboard `## Project` section, and post a pinned index with an onboarding button.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel has been provisioned
- **WHEN** seeding completes
- **THEN** Dashboard, Requirements, and Infrastructure canvases SHALL exist
- **AND** Deliverables and Incidents lists SHALL exist with core column schemas
- **AND** object IDs SHALL be stored in Dashboard canvas metadata as `TesEventContext`
- **AND** a pinned index message SHALL link all objects with a Complete onboarding button

#### Scenario: Metadata round-trip

- **GIVEN** a seeded Dashboard canvas with `TesEventContext` metadata
- **WHEN** the slack-app reads the metadata block
- **THEN** all object IDs, accountName, salesforceOpportunityUrl, memberUserIds, contextNotes, and onboarding state SHALL deserialize correctly
