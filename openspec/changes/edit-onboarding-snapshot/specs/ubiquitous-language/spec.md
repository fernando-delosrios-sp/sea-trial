## MODIFIED Requirements

### Requirement: Trigger context snapshot term

The glossary SHALL define **Trigger context snapshot** as the compact JSON `TesEventContext` stored in Onboarding Link Trigger inputs, initially baked at seed and rewritten on every successful onboarding submit. The pinned index Complete onboarding button MAY still carry the seed-time snapshot while onboarding is incomplete.

#### Scenario: Trigger context snapshot term in glossary

- **GIVEN** the ubiquitous-language spec
- **WHEN** a reader looks up Trigger context snapshot
- **THEN** a Trigger context snapshot term entry SHALL exist with definition, aliases, and notes that it is not live canvas markdown
- **AND** the notes SHALL state that the trigger copy is refreshed on successful onboarding submit

---

## Term entries (delta)

### Term: Onboarding
**Context**: onboarding
**Definition**: AE/SE modal flow collecting customer context, SailPoint suite selection, and stakeholders; completion sets `onboardingComplete: true` and opens the agent gate.
**Aliases**: onboarding form
**Notes**: Same modal for first complete and later edit via the Dashboard Complete onboarding link. Prefill uses snapshot `onboarding` when present, otherwise creation `accountName`. `/tes-onboard` is not an entry point.

### Term: Trigger context snapshot
**Context**: onboarding
**Definition**: Compact JSON serialization of `TesEventContext` stored in Onboarding Link Trigger inputs (and at seed on the pinned Complete onboarding button).
**Aliases**: onboarding snapshot, baked context
**Notes**: Seeded at channel create; rewritten on every successful onboarding submit. Not Dashboard markdown. Not recoverable from existing canvases via Slack APIs. Pinned-button copy is not required to refresh after complete.

### Term: TesEventContext
**Context**: global
**Definition**: Canonical shared type holding channel ID, project name, onboarding state, derived components, and IDs for all seeded Slack objects including the Situation Report canvas and the Onboarding Link Trigger id.
**Aliases**: event context
**Notes**: Defined in `packages/shared`. Readable copies live in the Onboarding Link Trigger snapshot. Dashboard canvas markdown is human-facing and SHALL NOT include a JSON dump of this type.
