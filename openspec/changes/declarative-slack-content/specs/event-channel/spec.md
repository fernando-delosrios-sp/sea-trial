## MODIFIED Requirements

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects, write creation fields to the Dashboard `## Project` section, and post a pinned index with an onboarding button. Canvas, list, and message content SHALL be loaded from declarative content files under `slack-app/content/`, not inline TypeScript templates.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel has been provisioned
- **WHEN** seeding completes
- **THEN** Dashboard, Requirements, and Infrastructure canvases SHALL exist
- **AND** Deliverables and Incidents lists SHALL exist with core column schemas from list JSON
- **AND** object IDs SHALL be stored in Dashboard canvas metadata as `TesEventContext`
- **AND** a pinned index message SHALL link all objects with a Complete onboarding button

#### Scenario: Metadata round-trip

- **GIVEN** a seeded Dashboard canvas with `TesEventContext` metadata
- **WHEN** the slack-app reads the metadata block
- **THEN** all object IDs, accountName, salesforceOpportunityUrl, memberUserIds, contextNotes, and onboarding state SHALL deserialize correctly
