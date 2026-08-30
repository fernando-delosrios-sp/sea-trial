## ADDED Requirements

### Requirement: TES Event Context Store

The slack-app SHALL persist each TES Event Channel's compact `TesEventContext` in a Slack Datastore whose primary key is the channel ID. Seeding SHALL `put` the row after objects exist. Opening onboarding SHALL `get` by the shortcut's `channel_id`. Submitting onboarding SHALL `put` the updated row. The store SHALL NOT be an external database. `TesEventContext` SHALL NOT include `onboardingTriggerId` or `onboardingLinkUrl`.

#### Scenario: Seed writes a store row

- **GIVEN** a new TES Event Channel has been provisioned
- **WHEN** seeding completes
- **THEN** a TES Event Context Store item SHALL exist whose primary key is that channel ID
- **AND** the item SHALL deserialize to a `TesEventContext` with object IDs and creation fields
- **AND** the snapshot SHALL NOT contain `onboardingTriggerId` or `onboardingLinkUrl`

#### Scenario: Store miss is not a canvas read

- **GIVEN** no TES Event Context Store item for a channel ID
- **WHEN** onboarding open looks up that ID
- **THEN** the lookup SHALL fail without calling `readCanvasMarkdown`

### Requirement: Global Complete onboarding grant at seed

On TES Event Channel seeding, the system SHALL grant the deploy-time `Complete onboarding` shortcut run access to that channel (`named_entities` / `permissions.add` with `channel_ids`). Seeding SHALL NOT create a trigger named `Complete Onboarding ({channelId})`.

#### Scenario: Seed grants the global shortcut to the channel

- **GIVEN** the workspace has a global `Complete onboarding` shortcut
- **WHEN** a new TES Event Channel is seeded
- **THEN** that channel SHALL be included in the shortcut's channel grants
- **AND** no trigger named `Complete Onboarding ({channelId})` SHALL be created

#### Scenario: People outside TES Event Channels cannot run it

- **GIVEN** a user who is not a member of any channel granted to `Complete onboarding`
- **WHEN** they open the Slack shortcut menu
- **THEN** `Complete onboarding` SHALL NOT be listed for that user

---

## MODIFIED Requirements

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects by executing the channel composition manifest for `tes-event`, write creation fields to the Dashboard `## Project` section, `put` a TES Event Context Store row for the channel, grant the global `Complete onboarding` shortcut to the channel, and post a pinned index without an interactive Complete onboarding button. Canvas, list, and message content SHALL be loaded from declarative content files under `slack-app/content/`, not inline TypeScript templates. Object IDs SHALL be mapped to step `id` values in the composition manifest and bridged to flat `TesEventContext` fields by the provisioner. Seeding SHALL include a Situation Report canvas initialized from `situation-report.hbs.md`. Display names for created canvases and lists SHALL be disambiguated per the Unique display names on provision collision requirement when workspace name collisions occur; manifest step `id` values and context field mapping SHALL remain unchanged regardless of suffix. Seeding SHALL NOT create a per-channel workflow trigger, SHALL NOT associate onboarding with the channel Workflows tab, and SHALL NOT feature a workflow.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel has been provisioned
- **WHEN** seeding completes via the channel provisioner
- **THEN** Dashboard, Requirements, Infrastructure, and Situation Report canvases SHALL exist
- **AND** Deliverables and Incidents lists SHALL exist with core column schemas from list JSON
- **AND** Deliverables and Incidents lists with `bookmark: true` SHALL be attached to the channel as header bookmarks per the List channel attachment requirement
- **AND** a TES Event Context Store row SHALL exist for that channel
- **AND** the global `Complete onboarding` shortcut SHALL be granted to that channel
- **AND** no trigger named `Complete Onboarding ({channelId})` SHALL be created
- **AND** object IDs SHALL be stored on `TesEventContext` in the store
- **AND** a pinned index message SHALL link all titled steps
- **AND** the pinned index SHALL NOT include a Complete onboarding or Edit onboarding button
- **AND** `TesEventContext` SHALL contain `situationReportCanvasId`
- **AND** `TesEventContext` MAY include optional `channelType` and `compositionVersion` from the manifest

#### Scenario: Snapshot round-trip

- **GIVEN** a seeded TES Event Channel with a compact `TesEventContext` snapshot in the store
- **WHEN** the slack-app deserializes that snapshot
- **THEN** all object IDs, accountName, salesforceOpportunityUrl, memberUserIds, contextNotes, onboarding state, and optional composition fields SHALL deserialize correctly

#### Scenario: Composition-driven provisioning order

- **GIVEN** the tes-event composition manifest declares ordered `steps` for canvases and lists
- **WHEN** channel seeding runs
- **THEN** all composition steps SHALL be executed in manifest `steps` order
- **AND** `TesEventContext` SHALL contain all peer object IDs after finalize

#### Scenario: Oversized pinned button snapshot fails seed

- **GIVEN** a `TesEventContext` whose compact JSON is larger than a Block Kit button value allows
- **WHEN** seeding posts the pinned index
- **THEN** seeding SHALL still complete
- **AND** that JSON SHALL live in the TES Event Context Store, not on a Complete onboarding button value

### Requirement: Dashboard onboarding canvas link

On TES Event Channel seeding, after canvases and lists exist, the system SHALL rewrite the Dashboard canvas so that while onboarding is incomplete the Sales Engineer **Onboarding tasks** checklist tells the Sales Engineer to run the `Complete onboarding` shortcut. The system SHALL NOT write a workflow shortcut URL of any form. After onboarding completes, the task SHALL render as checked.

#### Scenario: Dashboard instructs the shortcut

- **GIVEN** channel seeding completed
- **WHEN** Dashboard finalize runs
- **THEN** the Dashboard canvas SHALL tell the user to run `Complete onboarding`
- **AND** the plain `- [ ] Fill in opportunity details` entry SHALL NOT be present
- **AND** the Dashboard SHALL NOT contain a `https://slack.com/shortcuts/` link

#### Scenario: Dashboard link uses API share URL

- **GIVEN** channel seeding completed
- **WHEN** Dashboard finalize runs
- **THEN** the Dashboard SHALL NOT use an Onboarding Link Trigger `share_url` as the Complete onboarding href
- **AND** the onboarding task SHALL instruct the user to run the `Complete onboarding` shortcut

#### Scenario: Fabricated shortcut URL is rejected

- **GIVEN** Dashboard finalize runs for any TES Event Channel
- **WHEN** the onboarding task is written
- **THEN** the Dashboard SHALL NOT contain `https://slack.com/shortcuts/` followed only by a trigger ID
- **AND** the Dashboard SHALL NOT contain any `https://slack.com/shortcuts/` href

#### Scenario: Onboarding task ticked after submit

- **GIVEN** onboarding has been submitted for the channel
- **WHEN** the Dashboard canvas is rendered
- **THEN** the Onboarding tasks checklist SHALL contain a checked Complete onboarding task

### Requirement: Deploy-time shortcut installation

The "Create TES Event" and "Complete onboarding" shortcut triggers SHALL be provisioned as part of the standard deploy pipeline, not as a separate manual post-deploy step.

#### Scenario: No manual trigger create after deploy

- **GIVEN** an operator runs the GitHub Actions Deploy workflow
- **WHEN** the workflow succeeds
- **THEN** the "Create TES Event" trigger SHALL already be installed
- **AND** the "Complete onboarding" trigger SHALL already be installed
- **AND** README and smoke checklist SHALL NOT require manual `slack trigger create` for MVP smoke testing

---

## REMOVED Requirements

### Requirement: Onboarding trigger identity on TesEventContext

**Reason**: `onboardingTriggerId` and `onboardingLinkUrl` existed to refresh a per-channel Onboarding Link Trigger.

**Migration**: TES Event Context Store is the snapshot. Those fields are removed from `TesEventContext`.
