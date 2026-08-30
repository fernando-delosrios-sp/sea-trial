## MODIFIED Requirements

### Requirement: External service boundary

Application state SHALL remain Slack-native; only agent reasoning uses external services. Slack Datastores hosted with the slack-app SHALL count as Slack-native state.

#### Scenario: No external database

- **GIVEN** any deployment phase covered by this spec
- **WHEN** application state is persisted
- **THEN** state SHALL live in Slack canvases, lists, and Slack Datastores only
- **AND** agent-service SHALL NOT require Postgres, Redis, or equivalent state stores

#### Scenario: Outbound connectivity

- **GIVEN** a deployed slack-app calling agent-service
- **WHEN** Slack Functions execute
- **THEN** outbound HTTPS to agent-service URL, LLM API, and Grafana Cloud OTLP gateway (when logging enabled) SHALL be permitted by workspace policy and manifest `outgoingDomains`

### Requirement: Declarative trigger configuration

The slack-app SHALL declare trigger provisioning intent in a version-controlled config file listing trigger definition paths, scope, and optional channel IDs.

#### Scenario: Config lists default MVP triggers

- **GIVEN** `slack-app/triggers.config.yaml` in the repository
- **WHEN** an operator reads the config
- **THEN** it SHALL include an entry for `create_tes_event` with scope `global` and `enabled: true` by default
- **AND** it SHALL include an entry for `complete_onboarding` with scope `global` and `enabled: true`
- **AND** it SHALL reference trigger definition files under `slack-app/triggers/`

#### Scenario: Disabled triggers skipped

- **GIVEN** a trigger entry with `enabled: false`
- **WHEN** provisioning runs
- **THEN** that trigger SHALL NOT be created or updated
