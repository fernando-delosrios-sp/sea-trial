## MODIFIED Requirements

### Requirement: Onboarding modal

The system SHALL provide an onboarding modal accessible from the Complete onboarding button on the pinned index message and from the Complete onboarding link on the Dashboard canvas. Modal Block Kit content SHALL be loaded from `slack-app/content/modals/onboarding.json` with dynamic overlay for Account prefill and SailPoint suite options from domain JSON. The Account field SHALL be pre-filled from the trigger context snapshot (creation `accountName`) and SHALL remain editable. Opening and submitting onboarding SHALL use that snapshot and SHALL NOT read Dashboard canvas markdown via `canvases.sections.lookup` or canvas file download. If the snapshot is missing or cannot be deserialized, the system SHALL fail with a clear error directing the operator to re-run Create TES Event or repair with an explicit snapshot.

#### Scenario: Open onboarding form

- **GIVEN** a TES Event Channel with incomplete onboarding and a pinned Complete onboarding button that includes a trigger context snapshot
- **WHEN** a user clicks the Complete onboarding button on the pinned index
- **THEN** a modal SHALL open with all required onboarding fields from declarative JSON
- **AND** the Account field SHALL be pre-filled with the value from `TesEventContext.accountName` in the snapshot
- **AND** the handler SHALL NOT call `readCanvasMarkdown`

#### Scenario: Open onboarding from Workflows tab

- **GIVEN** a TES Event Channel with incomplete onboarding
- **WHEN** a channel member looks for Complete Onboarding in the channel Workflows tab
- **THEN** the Workflows tab SHALL NOT be a required onboarding entry point
- **AND** the onboarding modal SHALL still open from the Dashboard Complete onboarding link and the pinned index button when those carry a snapshot

#### Scenario: Open onboarding from Dashboard canvas link

- **GIVEN** a TES Event Channel with incomplete onboarding and a Dashboard Complete onboarding link pointing at that channel's Onboarding Link Trigger whose inputs include a trigger context snapshot
- **WHEN** a channel member clicks the Dashboard Complete onboarding link
- **THEN** the onboarding modal SHALL open for that channel
- **AND** the Account field SHALL be pre-filled with the value from `TesEventContext.accountName` in the snapshot
- **AND** the open function SHALL NOT call `readCanvasMarkdown`

#### Scenario: Submit onboarding

- **GIVEN** a user completes all onboarding fields including SailPoint suite selection
- **AND** the modal private metadata contains a deserializable trigger context snapshot
- **WHEN** they submit the form
- **THEN** the Dashboard canvas SHALL be updated with opportunity details and derived components using `replaceCanvasContent` (or equivalent full replace)
- **AND** `onboardingComplete` SHALL be set to true in `TesEventContext`
- **AND** `accountName` SHALL reflect the submitted Account value (which MAY differ from the creation default)
- **AND** a channel message SHALL announce that the agent is available when summoned
- **AND** submit SHALL NOT call `readCanvasMarkdown`

#### Scenario: Missing snapshot fails open

- **GIVEN** an Onboarding Link Trigger or pinned button that has channel and Dashboard IDs but no deserializable trigger context snapshot
- **WHEN** a user opens onboarding from that control
- **THEN** the system SHALL return a clear error that the channel must be re-created or repaired with an explicit snapshot
- **AND** the system SHALL NOT attempt to recover `TesEventContext` by reading the Dashboard canvas
