# observability Specification

## Purpose
TBD - created by archiving change grafana-otlp-logging. Update Purpose after archive.
## Requirements
### Requirement: OTLP log export to Grafana Cloud

The platform SHALL push structured application logs to Grafana Cloud via OTLP HTTP when logging is enabled.

#### Scenario: Logging enabled on agent-service

- **GIVEN** agent-service has `OTEL_LOGS_ENABLED=true`
- **AND** `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS` are configured
- **WHEN** a log event is emitted during request processing
- **THEN** agent-service SHALL export the log record to the OTLP logs endpoint
- **AND** the record SHALL include `service.name` identifying `tes-agent-service`

#### Scenario: Logging enabled on slack-app

- **GIVEN** slack-app has `OTEL_LOGS_ENABLED=true`
- **AND** OTLP environment variables are configured at deploy time
- **WHEN** a Slack function emits a log event
- **THEN** slack-app SHALL export the log record to the OTLP logs endpoint before the function returns
- **AND** the record SHALL include `service.name` identifying `tes-slack-app`

#### Scenario: Logging disabled

- **GIVEN** `OTEL_LOGS_ENABLED` is absent or not `true`
- **WHEN** application code emits a log event
- **THEN** the runtime SHALL NOT push logs to Grafana Cloud
- **AND** SHALL NOT require OTLP credentials to be present

### Requirement: Cross-service correlation identifier

The platform SHALL propagate a correlation identifier from slack-app to agent-service so logs can be joined in Grafana.

#### Scenario: Correlation header on agent invocation

- **GIVEN** slack-app invokes agent-service
- **WHEN** the HTTP POST to `/agents/requirements/process` is sent
- **THEN** slack-app SHALL include an `X-Correlation-Id` header with a unique identifier
- **AND** all slack-app log records for that invocation SHALL include the same correlation identifier

#### Scenario: Agent-service reads correlation header

- **GIVEN** agent-service receives a POST with `X-Correlation-Id`
- **WHEN** request processing begins
- **THEN** agent-service SHALL attach that correlation identifier to all log records for the request
- **AND** SHALL NOT generate a different identifier for the same request

#### Scenario: Missing correlation header

- **GIVEN** agent-service receives a POST without `X-Correlation-Id`
- **WHEN** request processing begins
- **THEN** agent-service SHALL generate a correlation identifier for the request
- **AND** SHALL attach it to all log records for that request

### Requirement: Log event schema

The platform SHALL emit structured log events with documented names and metadata fields for key lifecycle points.

#### Scenario: Slack invoke lifecycle events

- **GIVEN** logging is enabled on slack-app
- **WHEN** the Requirements Agent invoke flow runs
- **THEN** slack-app SHALL emit `invoke.started` before calling agent-service
- **AND** SHALL emit `invoke.completed` on success or `invoke.failed` on error
- **AND** each event SHALL include correlation identifier, duration where applicable, and non-sensitive context fields

#### Scenario: Agent request lifecycle events

- **GIVEN** logging is enabled on agent-service
- **WHEN** a process request is handled
- **THEN** agent-service SHALL emit `request.received` at request start
- **AND** SHALL emit `documents.parsed` after document parsing with per-file metadata (filename, mime type, supported flag, error message if any)
- **AND** SHALL emit `agent.completed` on success or `request.failed` on error

### Requirement: Log data redaction

The platform SHALL NOT export customer content or secrets in observability log records.

#### Scenario: Forbidden fields excluded

- **GIVEN** any log event is about to be exported
- **WHEN** the event payload is built
- **THEN** the exported record SHALL NOT contain file bytes, base64 content, Requirements Canvas markdown, LLM prompts, LLM responses, API keys, or Slack tokens
- **AND** shared redaction helpers SHALL strip or reject known sensitive keys before export

#### Scenario: Safe metadata allowed

- **GIVEN** a document parse log event
- **WHEN** the event is exported
- **THEN** the record MAY include filename, mime type, supported boolean, and sanitized error message
- **AND** SHALL NOT include extracted document text

### Requirement: Slack function log flush

slack-app SHALL flush pending OTLP log batches before Slack functions return.

#### Scenario: Flush on function completion

- **GIVEN** a Slack function has emitted log events during execution
- **WHEN** the function handler is about to return (success or error)
- **THEN** slack-app SHALL flush pending log exports before returning control to Slack
- **AND** user-visible function behavior SHALL NOT fail solely because log export failed

