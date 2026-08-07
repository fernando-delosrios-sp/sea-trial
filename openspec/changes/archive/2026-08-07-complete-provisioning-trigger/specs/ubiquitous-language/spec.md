## ADDED Requirements

### Requirement: Account term

The project SHALL use **Account** as the preferred user-facing and glossary term for the customer or prospect identity associated with a TES Event Channel.

#### Scenario: Account label in creation modal

- **GIVEN** a user opens the Create TES Event creation modal
- **WHEN** the modal is displayed
- **THEN** the identity field SHALL be labeled Account (not Customer or Prospect)

#### Scenario: Account in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** an Account term entry SHALL exist with definition and bounded context

---

## MODIFIED Requirements

### Requirement: Consistent naming

Implementation artifacts (types, functions, API fields, Slack labels) SHALL use glossary terms verbatim unless a documented alias applies.

#### Scenario: Code review against glossary

- **GIVEN** an implementation uses a domain label visible to other systems or users
- **WHEN** the label differs from the glossary preferred spelling without an alias entry
- **THEN** the implementation MUST be corrected or the glossary MUST be updated first

---

## Term entries (delta)

### Term: Account
**Context**: event-channel, onboarding
**Definition**: The customer or prospect organization identity for a TES engagement; captured at channel creation and confirmable during onboarding.
**Aliases**: customer (deprecated in UI), prospect (deprecated in UI)
**Notes**: Stored as `accountName` in `TesEventContext`; pre-filled and editable in onboarding modal.

### Term: Onboarding
**Context**: onboarding
**Definition**: AE/SE modal flow collecting delivery scope (goal, deal history, SailPoint suite, stakeholders, etc.); Account is pre-filled from creation; completion sets `onboardingComplete: true` and opens the agent gate.
**Aliases**: onboarding form
**Notes**: Triggered via Complete onboarding button on pinned index.
