# Onboarding

## Purpose

AE/SE onboarding flow, suite-to-components mapping, and agent gate control.
## Requirements
### Requirement: Onboarding modal

The system SHALL provide an onboarding modal accessible from the Complete onboarding button on the pinned index message. Modal Block Kit content SHALL be loaded from `slack-app/content/modals/onboarding.json` with dynamic overlay for Account prefill and SailPoint suite options from domain JSON. The Account field SHALL be pre-filled from creation context and SHALL remain editable.

#### Scenario: Open onboarding form

- **GIVEN** a TES Event Channel with incomplete onboarding
- **WHEN** a user clicks the Complete onboarding button on the pinned index
- **THEN** a modal SHALL open with all required onboarding fields from declarative JSON
- **AND** the Account field SHALL be pre-filled with the value from `TesEventContext.accountName`

#### Scenario: Submit onboarding

- **GIVEN** a user completes all onboarding fields including SailPoint suite selection
- **WHEN** they submit the form
- **THEN** the Dashboard canvas SHALL be updated with opportunity details and derived components
- **AND** `onboardingComplete` SHALL be set to true in `TesEventContext`
- **AND** `accountName` SHALL reflect the submitted Account value (which MAY differ from the creation default)
- **AND** a channel message SHALL announce that the agent is available when summoned

### Requirement: Suite-to-components mapping

The system SHALL derive technical components from the selected SailPoint suite via domain JSON loaded from `slack-app/content/domain/sailpoint-suites.json`. SailPoint suite select options in the onboarding modal SHALL be sourced from the same domain JSON without hardcoded option lists in TypeScript.

#### Scenario: Identity Security Cloud mapping

- **GIVEN** onboarding form with `sailpointSuite` set to "Identity Security Cloud"
- **WHEN** `deriveComponents` is called
- **THEN** the expected module list for that suite SHALL be returned from domain JSON

#### Scenario: Suite options from domain JSON

- **GIVEN** `sailpoint-suites.json` defines supported suite names
- **WHEN** the onboarding modal is built
- **THEN** the SailPoint Suite static_select options SHALL match the domain JSON suite keys
- **AND** no additional suites SHALL appear beyond those defined in domain JSON

### Requirement: Agent gate

The system SHALL block Requirements Agent invocation until onboarding is complete. The agent SHALL NOT auto-invoke on channel creation or onboarding submit.

#### Scenario: Agent blocked before onboarding

- **GIVEN** a TES Event Channel where `onboardingComplete` is false
- **WHEN** a user @mentions the bot with documents
- **THEN** the agent SHALL NOT be invoked
- **AND** the user SHALL be directed to complete onboarding via the pinned index button

#### Scenario: Agent available after onboarding

- **GIVEN** a TES Event Channel where `onboardingComplete` is true
- **WHEN** a user @mentions the bot with documents
- **THEN** the agent invocation flow SHALL proceed

#### Scenario: No auto-invoke on lifecycle events

- **GIVEN** a TES Event Channel is provisioned or onboarding is submitted
- **WHEN** provisioning or onboarding completes
- **THEN** the Requirements Agent SHALL NOT be invoked automatically

