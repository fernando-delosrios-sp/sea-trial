## ADDED Requirements

### Requirement: Onboarding entry point term

The glossary SHALL define **Onboarding entry point** as the workspace shortcut `Complete onboarding`, which opens the onboarding modal for the channel in view using the TES Event Context Store.

#### Scenario: Onboarding entry point term in glossary

- **GIVEN** the ubiquitous-language spec
- **WHEN** a reader looks up Onboarding entry point
- **THEN** an Onboarding entry point term entry SHALL exist with definition, aliases, and notes that it is one global shortcut, not a per-channel trigger, bookmark, or pinned button

### Requirement: TES Event Context Store term

The glossary SHALL define **TES Event Context Store** as the Slack Datastore whose primary key is TES Event Channel ID and whose item is compact `TesEventContext` JSON, written at seed and on every successful onboarding submit.

#### Scenario: TES Event Context Store term in glossary

- **GIVEN** the ubiquitous-language spec
- **WHEN** a reader looks up TES Event Context Store
- **THEN** a TES Event Context Store term entry SHALL exist with definition, aliases, and notes that it is Slack-hosted, not Postgres, and not canvas markdown

### Requirement: Shortcut menu visibility term

The glossary SHALL define **Shortcut menu visibility** as the rule that Slack lists a trigger in the shortcut menu of every channel a permitted user opens. Trigger grants select people — directly via user IDs, or indirectly as the members of a granted channel — and never the channel currently in view.

#### Scenario: Shortcut menu visibility term in glossary

- **GIVEN** the ubiquitous-language spec
- **WHEN** a reader looks up Shortcut menu visibility
- **THEN** a Shortcut menu visibility term entry SHALL exist with definition, aliases, and notes that `workflows.triggers.permissions` and `slack trigger access --channels` control who may run a trigger, not where it is listed
- **AND** the notes SHALL state that one global `Complete onboarding` is the accepted listing for TES Event Channel members

---

## MODIFIED Requirements

### Requirement: Trigger context snapshot term

The glossary SHALL define **Trigger context snapshot** as the compact JSON `TesEventContext` stored in the TES Event Context Store, initially written at seed and rewritten on every successful onboarding submit.

#### Scenario: Trigger context snapshot term in glossary

- **GIVEN** the ubiquitous-language spec
- **WHEN** a reader looks up Trigger context snapshot
- **THEN** a Trigger context snapshot term entry SHALL exist with definition, aliases, and notes that it is not live canvas markdown
- **AND** the notes SHALL state that the store copy is refreshed on successful onboarding submit
- **AND** the notes SHALL state that no per-channel trigger input copy exists

---

## REMOVED Requirements

### Requirement: Onboarding Link Trigger term

**Reason**: The per-channel `Complete Onboarding ({channelId})` shortcut is retired.

**Migration**: Replaced by Onboarding entry point (global `Complete onboarding`) and TES Event Context Store.
