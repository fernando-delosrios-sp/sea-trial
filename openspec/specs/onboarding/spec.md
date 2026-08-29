# Onboarding

## Purpose

AE/SE onboarding flow, suite-to-components mapping, and agent gate control.
## Requirements
### Requirement: Onboarding modal

The system SHALL provide an onboarding modal accessible from the Complete onboarding button on the pinned index message (while onboarding is incomplete) and from the Complete onboarding link on the Dashboard canvas. Modal Block Kit content SHALL be loaded from `slack-app/content/modals/onboarding.json` with dynamic overlay for Account prefill, optional full `onboarding` form prefill, and SailPoint suite options from domain JSON. Opening and submitting onboarding SHALL use the trigger context snapshot and SHALL NOT read Dashboard canvas markdown via `canvases.sections.lookup` or canvas file download. If the snapshot is missing or cannot be deserialized, the system SHALL fail with a clear error directing the operator to re-run Create TES Event or repair with an explicit snapshot.

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
- **AND** the modal private metadata contains a deserializable trigger context snapshot with `onboardingTriggerId`
- **WHEN** they submit the form
- **THEN** the Dashboard canvas SHALL be updated with opportunity details and derived components using `replaceCanvasContent` (or equivalent full replace)
- **AND** `onboardingComplete` SHALL be set to true in `TesEventContext`
- **AND** `accountName` SHALL reflect the submitted Account value (which MAY differ from the creation default)
- **AND** a channel message SHALL announce that the agent is available when summoned
- **AND** the Onboarding Link Trigger snapshot SHALL be updated to compact JSON of that post-submit context
- **AND** submit SHALL NOT call `readCanvasMarkdown`

#### Scenario: Missing snapshot fails open

- **GIVEN** an Onboarding Link Trigger or pinned button that has channel and Dashboard IDs but no deserializable trigger context snapshot
- **WHEN** a user opens onboarding from that control
- **THEN** the system SHALL return a clear error that the channel must be re-created or repaired with an explicit snapshot
- **AND** the system SHALL NOT attempt to recover `TesEventContext` by reading the Dashboard canvas

### Requirement: Edit onboarding from refreshed snapshot

After onboarding is complete, opening the Dashboard Complete onboarding link SHALL use the latest trigger context snapshot. When that snapshot includes `onboarding`, the modal SHALL prefill every onboarding field from that form. A successful re-submit SHALL update the Onboarding Link Trigger snapshot to the new `TesEventContext` and SHALL NOT post another agent-available channel message. Submit SHALL fail clearly if `onboardingTriggerId` is missing or trigger update fails, and SHALL NOT call `readCanvasMarkdown`.

#### Scenario: Open after complete prefills submitted fields

- **GIVEN** a TES Event Channel where onboarding has been submitted
- **AND** the Onboarding Link Trigger snapshot includes `onboarding` and `onboardingComplete` true
- **WHEN** a channel member clicks the Dashboard Complete onboarding link
- **THEN** the onboarding modal SHALL open
- **AND** each onboarding field SHALL be pre-filled from snapshot `onboarding`
- **AND** the open function SHALL NOT call `readCanvasMarkdown`

#### Scenario: Re-submit refreshes snapshot without repeating announcement

- **GIVEN** a TES Event Channel where `onboardingComplete` is already true
- **AND** the modal private metadata contains a deserializable snapshot with `onboardingTriggerId`
- **WHEN** the user submits an edited onboarding form
- **THEN** the Dashboard canvas SHALL be replaced with opportunity details from the new form
- **AND** the Onboarding Link Trigger `dashboard_canvas_content` SHALL be updated to compact JSON of the post-submit `TesEventContext`
- **AND** the system SHALL NOT post the first-complete agent-available channel message
- **AND** submit SHALL NOT call `readCanvasMarkdown`

#### Scenario: Submit fails when trigger id is missing

- **GIVEN** a deserializable snapshot that has no `onboardingTriggerId`
- **WHEN** the user submits the onboarding form
- **THEN** the system SHALL return a clear error to re-create or repair the channel
- **AND** the Onboarding Link Trigger snapshot SHALL NOT be left silently stale as the only outcome without an error

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

