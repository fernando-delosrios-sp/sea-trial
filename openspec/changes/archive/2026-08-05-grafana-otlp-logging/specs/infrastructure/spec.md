## ADDED Requirements

### Requirement: Observability environment configuration

Deploy-time configuration SHALL supply Grafana Cloud OTLP settings to both runtimes without storing credentials in source control.

#### Scenario: Agent-service OTLP env vars

- **GIVEN** agent-service is deployed to Render
- **WHEN** observability is enabled
- **THEN** the service SHALL receive `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_SERVICE_NAME`, and `OTEL_LOGS_ENABLED` via environment variables
- **AND** credentials SHALL be sourced from GitHub Secrets at deploy time

#### Scenario: Slack-app OTLP env vars

- **GIVEN** slack-app is deployed via GitHub Actions
- **WHEN** observability is enabled
- **THEN** the deploy workflow SHALL set OTLP environment variables on the Slack app via `slack env set`
- **AND** functions SHALL read OTLP settings from the function `env` context

### Requirement: Slack outbound domain for OTLP gateway

slack-app SHALL allow outbound HTTPS to the Grafana Cloud OTLP gateway.

#### Scenario: OTLP hostname in outgoingDomains

- **GIVEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is configured at manifest build or deploy time
- **WHEN** the Slack app manifest is generated
- **THEN** `outgoingDomains` SHALL include the OTLP gateway hostname derived from that endpoint
- **AND** SHALL continue to include the agent-service hostname and `localhost` for development

#### Scenario: Blocked outbound without allowlist

- **GIVEN** the OTLP gateway hostname is not in `outgoingDomains`
- **WHEN** a Slack function attempts OTLP log push
- **THEN** Slack SHALL block the outbound request
- **AND** the manifest SHALL be updated to include the gateway hostname before production observability is enabled

## MODIFIED Requirements

### Requirement: External service boundary

Application state SHALL remain Slack-native; only agent reasoning uses external services.

#### Scenario: No external database

- **GIVEN** any deployment phase covered by this spec
- **WHEN** application state is persisted
- **THEN** state SHALL live in Slack canvases and lists only
- **AND** agent-service SHALL NOT require Postgres, Redis, or equivalent state stores

#### Scenario: Outbound connectivity

- **GIVEN** a deployed slack-app calling agent-service
- **WHEN** Slack Functions execute
- **THEN** outbound HTTPS to agent-service URL, LLM API, and Grafana Cloud OTLP gateway (when logging enabled) SHALL be permitted by workspace policy and manifest `outgoingDomains`
