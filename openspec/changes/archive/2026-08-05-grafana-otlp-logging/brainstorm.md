# Brainstorm — External Logging to Grafana (OTLP)

Raw capture of the design exploration session (2026-08-05).

## Background

The TES Event Process platform has minimal observability today:

- **agent-service** (Node.js on Render): one startup `console.log`; errors returned as JSON 500; no request IDs, timing, or structured events
- **slack-app** (Deno on Slack-managed infra): no application logging; errors via SlackFunction `{ error }`; execution logs only in Slack developer console

Ops cannot correlate a Slack @mention invocation with agent-service processing, diagnose parse failures at scale, or search historical errors outside Render/Slack UIs.

The user wants **external logging in Grafana** for both runtimes.

Existing architecture constraints:

- D3a: slack-app = adapter; agent-service = reasoning engine
- Slack-native state only — observability is an external read-only sink, not application state
- GitHub Actions deploy already syncs Render env and `slack env set` for slack-app
- `outgoingDomains` currently derived from `AGENT_SERVICE_URL` only

## Decision Chain

### Q1: Grafana setup — Cloud vs self-hosted?

**Context presented:** Need to know whether Grafana Cloud or self-hosted Loki/Prometheus stack is available.

**User response:** Grafana Cloud OTLP gateway (EU West 6):

- `OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-eu-west-6.grafana.net/otlp`
- Credentials via `OTEL_EXPORTER_OTLP_HEADERS` (Basic auth — store in secrets only; rotate if exposed)

**Answer:** Grafana Cloud OTLP (managed).

### Q2: Log transport — infrastructure drain vs in-app push?

**Context presented:**

- **Path A:** Render log drain → Alloy/Promtail → Loki (minimal code)
- **Path B:** Structured logging in app + OTLP push or drain

**User response:** In-app push.

**Answer:** Application code pushes logs via OTLP HTTP exporter.

### Q3: Scope — logs, metrics, or traces?

**User response:** Logs only (MVP).

**Answer:** OpenTelemetry Logs API only; no metrics/traces exporters in this change. Keep OTel SDK path open for future LGTM upgrade.

### Q4: Which components need visibility?

**User response:** Both slack-app and agent-service.

**Answer:** Full cross-service correlation via shared `correlationId` propagated on HTTP header `X-Correlation-Id`.

## Approaches Considered

### A) OTel Logs SDK + OTLP push (both runtimes) — **CHOSEN**

- agent-service: `@opentelemetry/sdk-logs` + `@opentelemetry/exporter-logs-otlp-http`
- slack-app: thin Deno-compatible OTLP client (fetch-based) OR npm OTel packages via Deno compat
- Shared `packages/observability` for event types, redaction, correlation ID helpers

### B) Render log drain only — REJECTED

User chose in-app push for richer business context and portability to AWS/Azure.

### C) Full OpenTelemetry (logs + metrics + traces) — DEFERRED

Heavier lift; user scoped MVP to logs only.

### D) Log document/canvas/LLM content — REJECTED

Security/privacy risk. Log metadata only: correlationId, eventId, channelId, file counts, parse outcomes, durations, sanitized errors.

## Agreed Approach

```
slack-app                          agent-service
  │ correlationId (UUID)             │
  │ log invoke.* ──OTLP──┐           │ log request.* / documents.parsed / agent.*
  │ POST + X-Correlation-Id ────────▶│ (same correlationId on all records)
  │ flush before return  │           │
  └──────────────────────┼───────────┘
                         ▼
              Grafana Cloud OTLP → Loki → Explore
```

**Log events (MVP):**

| Event | slack-app | agent-service |
|-------|-----------|---------------|
| invoke.started / completed / failed | ✓ | — |
| request.received / failed | — | ✓ |
| documents.parsed | — | ✓ |
| agent.completed | — | ✓ |

**Environment variables (secrets — not in repo):**

| Variable | Purpose |
|----------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Grafana Cloud OTLP base URL |
| `OTEL_EXPORTER_OTLP_HEADERS` | Authorization header (URL-encoded) |
| `OTEL_SERVICE_NAME` | `tes-slack-app` / `tes-agent-service` |
| `OTEL_LOGS_ENABLED` | Kill switch (`false` local dev default) |
| `OTEL_RESOURCE_ATTRIBUTES` | Optional e.g. `deployment.environment=prod` |

**Deploy wiring:**

- Render: extend GitHub Actions env sync (same pattern as `LLM_*`)
- slack-app: `slack env set` in deploy workflow
- manifest: add OTLP gateway hostname to `outgoingDomains`

**Slack-specific constraint:** Must `flush()` OTLP batch before Slack function returns or logs are lost when isolate terminates.

## Trade-offs Acknowledged

- Deno OTel SDK maturity vs thin fetch client — prefer thin client for slack-app if npm compat is fragile
- Local dev noise — default `OTEL_LOGS_ENABLED=false`; push only when explicitly enabled or in deployed env
- Credential rotation — never commit tokens; GitHub Secrets only

## Open at end of brainstorm

- Local dev / CI push vs deployed-only — default to kill switch (deployed pushes when env vars set)
- Grafana dashboard provisioning — out of MVP code scope; manual Explore queries documented

## Security note

User pasted live Grafana credentials in chat during exploration. **Rotate token before production deploy**; store replacement in GitHub Secrets only.
