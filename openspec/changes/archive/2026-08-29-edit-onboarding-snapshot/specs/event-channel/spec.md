## ADDED Requirements

### Requirement: Onboarding trigger identity on TesEventContext

After the Onboarding Link Trigger is created, `TesEventContext` SHALL include `onboardingTriggerId` and `onboardingLinkUrl` in the compact trigger context snapshot so a later onboarding submit can update that trigger without listing workspace triggers.

#### Scenario: Seed snapshot includes trigger id and share URL

- **GIVEN** channel seeding created an Onboarding Link Trigger
- **WHEN** seeding completes
- **THEN** the compact snapshot baked into that trigger SHALL deserialize to a `TesEventContext` whose `onboardingTriggerId` matches the created trigger id
- **AND** `onboardingLinkUrl` SHALL equal the trigger `share_url` or `shortcut_url`
