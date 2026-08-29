## ADDED Requirements

### Requirement: Onboarding Link Trigger term

The glossary SHALL define **Onboarding Link Trigger** as the per-channel Slack shortcut trigger named `Complete Onboarding ({channelId})` whose baked inputs are the TES Event Channel ID and Dashboard canvas ID, and whose API share URL is the Dashboard Complete onboarding href.

#### Scenario: Onboarding Link Trigger term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** an Onboarding Link Trigger term entry SHALL exist with definition, aliases, and notes that it is not the shared global Complete Onboarding shortcut

---

## Term entries (delta)

### Term: Dashboard Canvas
**Context**: event-channel
**Definition**: The event hub canvas holding onboarding data, stakeholders, dates, and status.
**Aliases**: dashboard
**Notes**: Opportunity details are written as readable markdown. While onboarding is incomplete, includes a Complete onboarding markdown link to the channel's Onboarding Link Trigger share URL.

### Term: Onboarding
**Context**: onboarding
**Definition**: AE/SE modal flow collecting customer context, SailPoint suite selection, and stakeholders; completion sets `onboardingComplete: true` and opens the agent gate.
**Aliases**: onboarding form
**Notes**: Triggered via the Dashboard canvas Complete onboarding link or the pinned index Complete onboarding button. `/tes-onboard` is not an entry point.

### Term: Onboarding Link Trigger
**Context**: onboarding
**Definition**: A channel-scoped Slack shortcut trigger named `Complete Onboarding ({channelId})` with baked `channel_id` and `dashboard_canvas_id` whose `share_url` is the Dashboard canvas Complete onboarding href.
**Aliases**: per-channel onboarding trigger
**Notes**: Distinct from a workspace-wide Complete Onboarding shortcut. The href MUST be the API share or shortcut URL, not a URL synthesized from trigger ID alone.
