## MODIFIED Requirements

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
