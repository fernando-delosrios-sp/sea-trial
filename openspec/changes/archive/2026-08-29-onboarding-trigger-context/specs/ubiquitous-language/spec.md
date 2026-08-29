## ADDED Requirements

### Requirement: Onboarding Link Trigger term

The glossary SHALL define **Onboarding Link Trigger** as the per-channel Slack shortcut trigger named `Complete Onboarding ({channelId})` whose baked inputs are the TES Event Channel ID, Dashboard canvas ID, and a trigger context snapshot, and whose API share URL is the Dashboard Complete onboarding href.

#### Scenario: Onboarding Link Trigger term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** an Onboarding Link Trigger term entry SHALL exist with definition, aliases, and notes that it is not a cloned workflow and not the shared global Complete Onboarding shortcut

### Requirement: Trigger context snapshot term

The glossary SHALL define **Trigger context snapshot** as the compact JSON `TesEventContext` frozen into the Onboarding Link Trigger and pinned index button at seed time.

#### Scenario: Trigger context snapshot term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** a Trigger context snapshot term entry SHALL exist with definition, aliases, and notes that it is not live canvas markdown

---

## Term entries (delta)

### Term: Dashboard Canvas
**Context**: event-channel
**Definition**: The event hub canvas holding onboarding data, stakeholders, dates, status, and the `TesEventContext` metadata block.
**Aliases**: dashboard
**Notes**: The metadata block is written at seed and onboarding submit. The slack-app SHALL NOT treat Slack canvas APIs as a readable source of `TesEventContext` for onboarding. While onboarding is incomplete, includes a Complete onboarding markdown link to the channel's Onboarding Link Trigger share URL.

### Term: TesEventContext
**Context**: global
**Definition**: Canonical shared type holding channel ID, project name, onboarding state, derived components, and IDs for all seeded Slack objects including the Situation Report canvas.
**Aliases**: event context
**Notes**: Defined in `packages/shared`. Written into Dashboard canvas metadata for humans. For onboarding open/submit, the readable copy is the trigger context snapshot.

### Term: Onboarding
**Context**: onboarding
**Definition**: AE/SE modal flow collecting customer context, SailPoint suite selection, and stakeholders; completion sets `onboardingComplete: true` and opens the agent gate.
**Aliases**: onboarding form
**Notes**: Triggered via the Dashboard canvas Complete onboarding link or the pinned index Complete onboarding button. `/tes-onboard` is not an entry point. Prefill and submit use the trigger context snapshot.

### Term: Onboarding Link Trigger
**Context**: onboarding
**Definition**: A channel-scoped Slack shortcut trigger named `Complete Onboarding ({channelId})` pointing at the single Open Onboarding workflow, with baked `channel_id`, `dashboard_canvas_id`, and trigger context snapshot, whose `share_url` is the Dashboard canvas Complete onboarding href.
**Aliases**: per-channel onboarding trigger
**Notes**: Not a per-channel copy of the workflow. Distinct from a workspace-wide Complete Onboarding shortcut. The href MUST be the API share or shortcut URL, not a URL synthesized from trigger ID alone.

### Term: Trigger context snapshot
**Context**: onboarding
**Definition**: Compact JSON serialization of seed-time `TesEventContext` stored in Onboarding Link Trigger inputs and the pinned index Complete onboarding button value.
**Aliases**: onboarding snapshot, baked context
**Notes**: Frozen at channel create until onboarding submit. Not Dashboard markdown. Not recoverable from existing canvases via Slack APIs.
