## ADDED Requirements

### Requirement: Dashboard onboarding canvas link

On TES Event Channel seeding, after canvases, lists, and the Onboarding Link Trigger exist, the system SHALL rewrite the Dashboard canvas so that while onboarding is incomplete the Sales Engineer **Onboarding tasks** checklist carries an unchecked Complete onboarding task whose markdown link is the created trigger's `share_url` or `shortcut_url`. That task SHALL replace the plain "Fill in opportunity details" entry. The system SHALL NOT write a shortcut URL synthesized from trigger ID alone (for example `https://slack.com/shortcuts/{id}` without the secret path segment). After onboarding completes, the task SHALL remain linked and render as checked so opportunity details can be edited later.

#### Scenario: Dashboard link uses API share URL

- **GIVEN** channel seeding created an Onboarding Link Trigger that returned a `share_url`
- **WHEN** Dashboard finalize runs
- **THEN** the Dashboard canvas SHALL contain a Complete onboarding link whose href equals that `share_url`
- **AND** that link SHALL appear as an unchecked task in the Sales Engineer Onboarding tasks checklist
- **AND** the plain `- [ ] Fill in opportunity details` entry SHALL NOT be present

#### Scenario: Fabricated shortcut URL is rejected

- **GIVEN** trigger create returned an ID but no `share_url` or `shortcut_url`
- **WHEN** seeding attempts to write the Dashboard onboarding link
- **THEN** seeding SHALL fail with a clear error
- **AND** the Dashboard SHALL NOT contain `https://slack.com/shortcuts/` followed only by the trigger ID

#### Scenario: Onboarding task ticked after submit

- **GIVEN** onboarding has been submitted for the channel
- **WHEN** the Dashboard canvas is rendered
- **THEN** the Onboarding tasks checklist SHALL contain a checked Complete onboarding task
- **AND** that task SHALL keep the Onboarding Link Trigger share URL so opportunity details can be edited later

---

## MODIFIED Requirements

### Requirement: Channel object seeding

On channel creation, the system SHALL seed all required Slack objects by executing the channel composition manifest for `tes-event`, write creation fields to the Dashboard `## Project` section, write the Onboarding Link Trigger share URL into the Dashboard Onboarding tasks checklist while onboarding is incomplete, and post a pinned index with an onboarding button. Canvas, list, and message content SHALL be loaded from declarative content files under `slack-app/content/`, not inline TypeScript templates. Object IDs SHALL be mapped to step `id` values in the composition manifest and bridged to flat `TesEventContext` fields by the provisioner. Seeding SHALL include a Situation Report canvas initialized from `situation-report.hbs.md`. Display names for created canvases and lists SHALL be disambiguated per the Unique display names on provision collision requirement when workspace name collisions occur; manifest step `id` values and context field mapping SHALL remain unchanged regardless of suffix. A workflow step with `link` `open_onboarding_workflow` SHALL create a per-channel Onboarding Link Trigger with baked channel and Dashboard canvas IDs; seeding SHALL NOT associate onboarding with the channel Workflows tab via `bookmark` or `featured` flags.

#### Scenario: Objects seeded on creation

- **GIVEN** a new TES Event Channel has been provisioned
- **WHEN** seeding completes via the channel provisioner
- **THEN** Dashboard, Requirements, Infrastructure, and Situation Report canvases SHALL exist
- **AND** Deliverables and Incidents lists SHALL exist with core column schemas from list JSON
- **AND** Deliverables and Incidents lists with `bookmark: true` SHALL be attached to the channel as header bookmarks per the List channel attachment requirement
- **AND** a per-channel Onboarding Link Trigger named `Complete Onboarding ({channelId})` SHALL exist with baked `channel_id` and `dashboard_canvas_id`
- **AND** the Dashboard canvas SHALL include a Complete onboarding markdown link using that trigger's share URL
- **AND** object IDs SHALL be stored on `TesEventContext` and carried as a compact snapshot on the Onboarding Link Trigger and pinned index buttons
- **AND** a pinned index message SHALL link all titled steps with a Complete onboarding button
- **AND** `TesEventContext` SHALL contain `situationReportCanvasId`
- **AND** `TesEventContext` MAY include optional `channelType` and `compositionVersion` from the manifest

#### Scenario: Snapshot round-trip

- **GIVEN** a seeded TES Event Channel with a compact `TesEventContext` snapshot
- **WHEN** the slack-app deserializes that snapshot
- **THEN** all object IDs, accountName, salesforceOpportunityUrl, memberUserIds, contextNotes, onboarding state, and optional composition fields SHALL deserialize correctly

#### Scenario: Composition-driven provisioning order

- **GIVEN** the tes-event composition manifest declares ordered `steps` for canvases, lists, and workflows
- **WHEN** channel seeding runs
- **THEN** all composition steps SHALL be executed in manifest `steps` order
- **AND** `TesEventContext` SHALL contain all peer object IDs after finalize
