# Onboarding

Delta for initial MVP implementation. Mirrors requirements in `openspec/specs/onboarding/spec.md`.

## ADDED Requirements

### Requirement: Onboarding modal

The system SHALL provide an onboarding modal accessible from the pinned index button
and via `/tes-onboard`.

#### Scenario: Open onboarding form

- **GIVEN** a TES Event Channel with incomplete onboarding
- **WHEN** a user clicks "Complete onboarding" or runs `/tes-onboard`
- **THEN** a modal SHALL open with all required onboarding fields

#### Scenario: Submit onboarding

- **GIVEN** a user completes all onboarding fields including SailPoint suite selection
- **WHEN** they submit the form
- **THEN** the Dashboard canvas SHALL be updated with opportunity details
- **AND** `onboardingComplete` SHALL be set to true in `TesEventContext`
- **AND** technical components SHALL be derived from the selected suite
- **AND** a channel message SHALL announce that the agent is now available

### Requirement: Suite-to-components mapping

The system SHALL derive technical components from the selected SailPoint suite via a
static mapping.

#### Scenario: Identity Security Cloud mapping

- **GIVEN** onboarding form with `sailpointSuite` set to "Identity Security Cloud"
- **WHEN** `deriveComponents` is called
- **THEN** the expected module list for that suite SHALL be returned

### Requirement: Agent gate

The system SHALL block Requirements Agent invocation until onboarding is complete.

#### Scenario: Agent blocked before onboarding

- **GIVEN** a TES Event Channel where `onboardingComplete` is false
- **WHEN** a user @mentions the bot with documents
- **THEN** the agent SHALL NOT be invoked
- **AND** the user SHALL be directed to complete onboarding

#### Scenario: Agent available after onboarding

- **GIVEN** a TES Event Channel where `onboardingComplete` is true
- **WHEN** a user @mentions the bot
- **THEN** the agent invocation flow SHALL proceed
