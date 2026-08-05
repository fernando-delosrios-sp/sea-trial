## Context

The TES Event Process monorepo deploys two components with no shared observability layer:

| Component | Host | Logging today |
|-----------|------|---------------|
| `agent-service` | Render (MVP) | One `console.log` at startup; errors in JSON 500 responses |
| `slack-app` | Slack ROSI | No app logging; Slack dev console only |

Exploration (2026-08-05) confirmed Grafana Cloud OTLP (EU West 6) as the log backend, in-app OTLP push (not Render log drains), logs-only MVP scope, and coverage of both runtimes with correlation IDs.

GitHub Actions already syncs Render env vars and runs `slack env set` — OTLP credentials follow the same pattern.

## Goals / Non-Goals

**Goals:**

- Push structured JSON logs from both runtimes to Grafana Cloud via OTLP HTTP (`/v1/logs`)
- Correlate slack-app invocations with agent-service requests via `X-Correlation-Id`
- Enforce metadata-only logging with shared redaction helpers
- Gate logging with `OTEL_LOGS_ENABLED` (default off locally)
- Wire OTLP env vars through GitHub Actions deploy to Render and slack-app
- Allowlist OTLP gateway in Slack `outgoingDomains`
- Flush pending log batches before Slack functions return

**Non-Goals:**

- Metrics or distributed traces (defer; keep OTel Logs API for future upgrade)
- Grafana dashboard provisioning as code
- Logging file content, canvas markdown, LLM prompts/responses, or secrets
- Render log drains or sidecar collectors
- External database or state store for logs (Grafana Cloud is the sink)

## Decisions

### D1: Grafana Cloud OTLP as log sink

- **Choice:** Push to `OTEL_EXPORTER_OTLP_ENDPOINT` with `OTEL_EXPORTER_OTLP_HEADERS` Basic auth
- **Reason:** User confirmed existing Grafana Cloud EU West 6 stack; single endpoint for both services
- **Alternatives considered:** Self-hosted Loki + Promtail (rejected — no existing infra); Render log drain (rejected — user chose in-app push)

### D2: In-app OTLP push (not infrastructure drain)

- **Choice:** Application code exports logs via OTLP HTTP exporter
- **Reason:** Rich business context (parse outcomes, proposal counts); portable to AWS/Azure without platform-specific drains
- **Alternatives considered:** Render log drain only (rejected — limited structured fields)

### D3: OTLP JSON log format, logs only

- **Choice:** Export OTLP JSON log records over HTTP fetch on both runtimes (no OTel Logs SDK dependency)
- **Reason:** Shared payload builder in `packages/observability` keeps both runtimes aligned; avoids npm OTel compat issues in Deno and extra SDK weight on Node for logs-only MVP
- **Alternatives considered:** OTel Logs SDK on Node (deferred — fetch client sufficient for MVP); custom JSON POST to Loki push API (rejected — OTel is Grafana-native); full LGTM stack now (deferred)

### D4: Shared `packages/observability` for contract and export

- **Choice:** Shared package holds `LogEvent` types, `createCorrelationId()`, `redact()`, OTLP payload builder; both agent-service and slack-app use thin fetch-based exporters built on the shared builder
- **Reason:** Single contract prevents field drift; fetch export works reliably in both Node and Deno Slack SDK environments
- **Alternatives considered:** Duplicate types in each runtime (rejected — drift risk); OTel Logs SDK on Node only (rejected — unnecessary split for logs-only MVP)

### D5: Correlation via HTTP header

- **Choice:** slack-app generates UUID `correlationId`; sends `X-Correlation-Id` on agent-service POST; agent-service reads header or generates fallback
- **Reason:** Simple join key in Grafana: `{service_name="tes-slack-app"} | correlationId="..."` + agent-service filter
- **Alternatives considered:** Pass correlationId in JSON body only (rejected — couples to API contract); Slack execution ID (uncertain availability in all functions)

### D6: Redaction at log boundary

- **Choice:** `redact()` strips/forbids known sensitive keys before export; log schema documents allowed fields per event type
- **Reason:** Customer documents and LLM content must not enter Grafana
- **Alternatives considered:** Log everything and filter in Grafana (rejected — data already exported)

### D7: `OTEL_LOGS_ENABLED` kill switch

- **Choice:** No OTLP push when `OTEL_LOGS_ENABLED` is not `true`; optional console JSON in dev
- **Reason:** Avoid noise and accidental credential use in local test runs
- **Alternatives considered:** Always push (rejected — dev/CI pollution)

### D8: Slack function flush before return

- **Choice:** Wrap function handlers with `try/finally { await logger.flush() }`
- **Reason:** Slack isolates terminate after return; batched OTLP exports may be dropped without flush
- **Alternatives considered:** Fire-and-forget (rejected — log loss)

### D9: Extend `outgoingDomains` for OTLP gateway

- **Choice:** Parse hostname from `OTEL_EXPORTER_OTLP_ENDPOINT` and add to `buildOutgoingDomains()` alongside agent-service host
- **Reason:** Slack blocks outbound HTTPS to non-allowlisted domains
- **Alternatives considered:** Hardcode gateway hostname (rejected — env-driven is more portable)

### D10: Deploy secrets via existing GitHub Actions workflow

- **Choice:** Add OTLP env vars to Render API sync job and `slack env set` deploy job
- **Reason:** Consistent with `LLM_*` and `AGENT_SERVICE_URL` pattern; credentials never in repo
- **Alternatives considered:** Manual one-time env setup (rejected — drift from GitHub source of truth)

## Risks / Trade-offs

- [Risk] Exposed Grafana token in exploration chat → Mitigation: rotate before deploy; GitHub Secrets only; never echo in CI logs
- [Risk] Slack function timeout if OTLP gateway slow → Mitigation: short HTTP timeout on push; async batch with flush timeout cap; fail open (don't block user flow)
- [Risk] Deno OTel npm compat issues → Mitigation: thin fetch-based OTLP client using shared payload builder
- [Risk] Log volume/cost in Grafana Cloud → Mitigation: metadata-only events; kill switch; no document content
- [Trade-off] Logs-only MVP limits alerting on latency SLIs → Accepted; add metrics in future change
- [Trade-off] Not all slack-app functions instrumented in first pass → Accepted; `invoke_agent` priority, others follow tasks order

## Migration Plan

1. Rotate Grafana Cloud access token if previously exposed; store in GitHub Secret `OTEL_EXPORTER_OTLP_HEADERS`
2. Add GitHub Variable `OTEL_EXPORTER_OTLP_ENDPOINT` and service name vars
3. Implement `packages/observability` and agent-service OTel init
4. Wire agent-service request logging and correlation header handling
5. Implement slack-app logger + `invoke_agent` instrumentation + outgoingDomains update
6. Update deploy workflow to sync OTLP env to Render and slack-app
7. Deploy via GitHub Actions; verify logs in Grafana Explore with test @mention
8. Rollback: set `OTEL_LOGS_ENABLED=false` in Render/slack env and redeploy; or remove env vars

## Open Questions

- Whether to instrument all seven slack-app functions in MVP or only `invoke_agent` + `accept_proposals` + `handle_thread_reply` (design assumes priority tier in tasks)
- Grafana Explore saved queries / starter dashboard — document manually in README vs separate ops task
