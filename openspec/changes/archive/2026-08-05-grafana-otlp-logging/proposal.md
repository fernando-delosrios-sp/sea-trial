## Why

The TES platform has almost no structured observability today: agent-service emits a single startup log and returns errors only in HTTP responses; slack-app has no application logging and execution details live only in Slack's developer console. Ops cannot search errors across services, correlate a Slack @mention with agent processing, or diagnose document parse failures without manual log diving in Render and Slack UIs.

Adding external logging to Grafana Cloud via OTLP gives a single query surface for both runtimes, with correlation IDs tying slack-app invocations to agent-service requests. This is needed before production rollout and AWS/Azure migration, when Render and Slack consoles alone will not scale.

## What Changes

**Structured OTLP log push**
- From: No structured logging; stdout/console only on agent-service
- To: Both runtimes push structured log records to Grafana Cloud OTLP (`/v1/logs`) when enabled
- Reason: Centralized search, alerting, and cross-service correlation
- Impact: Non-breaking; gated by `OTEL_LOGS_ENABLED`

**Shared observability contract**
- From: No shared logging types or redaction rules
- To: `packages/observability` with log event schema, correlation ID helpers, and redaction utilities consumed by both runtimes
- Reason: Consistent fields and safe logging across Deno and Node
- Impact: New workspace package; both services add dependency

**Cross-service correlation**
- From: No request tracing between slack-app and agent-service
- To: slack-app generates `correlationId`, sends `X-Correlation-Id` header; agent-service attaches same ID to all log records for that request
- Reason: Join slack-app and agent logs in Grafana Explore
- Impact: Non-breaking HTTP header addition

**Deploy and manifest wiring**
- From: GitHub deploy syncs `LLM_*` and `AGENT_SERVICE_URL` only; `outgoingDomains` includes agent-service host only
- To: Deploy workflow syncs OTLP env vars to Render and slack-app; manifest allowlists Grafana OTLP gateway hostname
- Reason: In-app push requires credentials and outbound HTTPS from Slack Functions
- Impact: New GitHub Secrets; manifest redeploy required

**Data redaction**
- From: No logging policy
- To: Explicit prohibition on logging file content, canvas markdown, LLM prompts/responses, tokens; metadata-only log fields
- Reason: Customer document and prompt data must not leave the app into observability backends
- Impact: Spec-level requirement enforced in redaction helpers

## Capabilities

### New Capabilities

- `observability`: Structured OTLP log push to Grafana Cloud, correlation ID propagation, redaction rules, log event schema, and flush semantics for Slack Functions

### Modified Capabilities

- `infrastructure`: Add requirements for Grafana Cloud OTLP configuration, deploy-time secret injection for both services, and Slack outgoing domain allowlisting for the OTLP gateway

## Impact

- **New package:** `packages/observability/` — types, redaction, correlation, OTLP JSON helpers
- **Modified:** `agent-service/src/server.ts`, requirements graph — structured log events at request lifecycle points
- **Modified:** `slack-app/functions/invoke_agent/mod.ts` (priority), other functions as follow-on — log + flush wrapper
- **Modified:** `slack-app/lib/agent-client.ts` — `X-Correlation-Id` header
- **Modified:** `slack-app/lib/outgoing-domains.ts`, `slack-app/manifest.ts` — OTLP gateway hostname
- **Modified:** `.github/workflows/deploy.yml` — sync OTLP secrets to Render and slack-app
- **Modified:** `render.yaml`, `agent-service/.env.example`, `slack-app/.env.example`, `README.md`, `docs/tech-stack-requirements.md`
- **GitHub Secrets:** `OTEL_EXPORTER_OTLP_HEADERS` (or split token secret); Variables: `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME` per service or shared with resource attributes
- **External:** Grafana Cloud OTLP gateway (EU West 6)
- **Out of scope:** Metrics/traces exporters, Grafana dashboard-as-code, log sampling policies, PII classification beyond documented redaction list
