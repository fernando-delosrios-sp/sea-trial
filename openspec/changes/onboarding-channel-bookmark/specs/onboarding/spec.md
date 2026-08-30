## MODIFIED Requirements

### Requirement: Onboarding modal

The system SHALL provide an onboarding modal opened by the workspace shortcut `Complete onboarding`. That shortcut SHALL pass the channel in view as `channel_id` and SHALL load `TesEventContext` from the TES Event Context Store for that ID. Modal Block Kit content SHALL be loaded from `slack-app/content/modals/onboarding.json` with dynamic overlay for Account prefill, optional full `onboarding` form prefill, and SailPoint suite options from domain JSON. Opening and submitting SHALL NOT read Dashboard canvas markdown via `canvases.sections.lookup` or canvas file download. If the store has no row or the snapshot cannot be deserialized, the system SHALL fail with a clear error directing the operator to re-run Create TES Event or repair.

#### Scenario: Open onboarding form

- **GIVEN** a TES Event Channel with incomplete onboarding and a TES Event Context Store row for that channel
- **AND** the user may run `Complete onboarding`
- **WHEN** they invoke `Complete onboarding` in that channel
- **THEN** a modal SHALL open with all required onboarding fields from declarative JSON
- **AND** the Account field SHALL be pre-filled from `TesEventContext.accountName` in the store row
- **AND** the handler SHALL NOT call `readCanvasMarkdown`

#### Scenario: Open onboarding from Workflows tab

- **GIVEN** a TES Event Channel with incomplete onboarding
- **WHEN** a channel member looks for Complete Onboarding in the channel Workflows tab
- **THEN** the Workflows tab SHALL NOT be a required onboarding entry point
- **AND** the onboarding modal SHALL still open from the `Complete onboarding` shortcut when a store row exists

#### Scenario: Open onboarding from Dashboard canvas link

- **GIVEN** a TES Event Channel with incomplete onboarding
- **WHEN** a channel member uses the Dashboard onboarding task
- **THEN** that task SHALL NOT open the modal by itself
- **AND** invoking `Complete onboarding` in that channel SHALL open the modal from the TES Event Context Store
- **AND** the open path SHALL NOT call `readCanvasMarkdown`

#### Scenario: Open onboarding from a non-TES channel

- **GIVEN** a user who may run `Complete onboarding`
- **AND** the channel in view has no TES Event Context Store row
- **WHEN** they invoke `Complete onboarding`
- **THEN** the system SHALL fail with a clear error that this channel is not a TES Event Channel
- **AND** the system SHALL NOT open the onboarding modal
- **AND** the system SHALL NOT call `readCanvasMarkdown`

#### Scenario: Submit onboarding

- **GIVEN** a user completes all onboarding fields including SailPoint suite selection
- **AND** the modal was opened from a deserializable TES Event Context Store row
- **WHEN** they submit the form
- **THEN** the Dashboard canvas SHALL be updated with opportunity details and derived components using `replaceCanvasContent` (or equivalent full replace)
- **AND** `onboardingComplete` SHALL be set to true in `TesEventContext`
- **AND** `accountName` SHALL reflect the submitted Account value (which MAY differ from the creation default)
- **AND** a channel message SHALL announce that the agent is available when summoned
- **AND** the TES Event Context Store row for that channel SHALL be replaced with compact JSON of that post-submit context
- **AND** submit SHALL NOT call `readCanvasMarkdown`

#### Scenario: Missing snapshot fails open

- **GIVEN** `Complete onboarding` is invoked in a TES Event Channel with no deserializable store row
- **WHEN** the open handler runs
- **THEN** the system SHALL return a clear error that the channel must be re-created or repaired
- **AND** the system SHALL NOT attempt to recover `TesEventContext` by reading the Dashboard canvas

---

## ADDED Requirements

### Requirement: Edit onboarding from the store

After onboarding is complete, invoking `Complete onboarding` in that TES Event Channel SHALL use the latest TES Event Context Store row. When that row includes `onboarding`, the modal SHALL prefill every onboarding field from that form. A successful re-submit SHALL `put` the new `TesEventContext` and SHALL NOT post another agent-available channel message. Submit SHALL fail clearly if the store `put` fails, and SHALL NOT call `readCanvasMarkdown`.

#### Scenario: Open after complete prefills submitted fields

- **GIVEN** a TES Event Channel where onboarding has been submitted
- **AND** the TES Event Context Store row includes `onboarding` and `onboardingComplete` true
- **WHEN** a channel member invokes `Complete onboarding` in that channel
- **THEN** the onboarding modal SHALL open
- **AND** each onboarding field SHALL be pre-filled from snapshot `onboarding`
- **AND** the open function SHALL NOT call `readCanvasMarkdown`

#### Scenario: Re-submit refreshes snapshot without repeating announcement

- **GIVEN** a TES Event Channel where `onboardingComplete` is already true
- **WHEN** the user submits an edited onboarding form
- **THEN** the Dashboard canvas SHALL be replaced with opportunity details from the new form
- **AND** the TES Event Context Store row SHALL be updated to compact JSON of the post-submit `TesEventContext`
- **AND** the system SHALL NOT post the first-complete agent-available channel message
- **AND** submit SHALL NOT call `readCanvasMarkdown`

#### Scenario: Submit fails when store write fails

- **GIVEN** a deserializable store row
- **WHEN** the user submits the onboarding form
- **AND** the TES Event Context Store `put` fails
- **THEN** the system SHALL return a clear error
- **AND** the operator SHALL NOT be left with a successful submit and a silently stale store row as the only outcome

---

## REMOVED Requirements

### Requirement: Edit onboarding from refreshed snapshot

**Reason**: The requirement keyed the post-completion edit path to the Onboarding Link Trigger and `onboardingTriggerId`.

**Migration**: Replaced by Edit onboarding from the store, using the global `Complete onboarding` shortcut and TES Event Context Store `put`.
