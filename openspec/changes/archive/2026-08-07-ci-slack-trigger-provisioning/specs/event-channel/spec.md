## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Deploy-time shortcut installation

The "Create TES Event" shortcut trigger SHALL be provisioned as part of the standard deploy pipeline, not as a separate manual post-deploy step.

#### Scenario: No manual trigger create after deploy

- **GIVEN** an operator runs the GitHub Actions Deploy workflow
- **WHEN** the workflow succeeds
- **THEN** the "Create TES Event" trigger SHALL already be installed
- **AND** README and smoke checklist SHALL NOT require manual `slack trigger create` for MVP smoke testing
