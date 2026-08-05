## 1. Shared observability package

- [x] 1.1 Create `packages/observability` with `LogEvent` types, correlation ID helper, and redaction utilities
- [x] 1.2 Add OTLP JSON log record builder (resource, scope, log record attributes) for fetch-based export
- [x] 1.3 Add unit tests for redaction (forbidden keys stripped) and correlation ID generation
- [x] 1.4 Wire package into root npm workspaces and build script

## 2. Agent-service OTLP logging

- [x] 2.1 Add fetch-based OTLP logger module gated by `OTEL_LOGS_ENABLED`
- [x] 2.2 Read `X-Correlation-Id` in `server.ts`; attach to request-scoped logger
- [x] 2.3 Emit `request.received`, `documents.parsed`, `agent.completed`, and `request.failed` at lifecycle points
- [x] 2.4 Add tests verifying correlation header propagation and redaction (no document content in log attributes)
- [x] 2.5 Update `agent-service/.env.example` with OTLP variables and kill switch

## 3. Slack-app OTLP logging

- [x] 3.1 Implement Deno logger using shared package + fetch OTLP push with flush and timeout
- [x] 3.2 Extend `buildOutgoingDomains()` to include OTLP gateway hostname from `OTEL_EXPORTER_OTLP_ENDPOINT`
- [x] 3.3 Add `X-Correlation-Id` header in `callRequirementsAgent`
- [x] 3.4 Instrument `invoke_agent` with `invoke.started` / `invoke.completed` / `invoke.failed` and flush wrapper
- [x] 3.5 Instrument `accept_proposals` and `handle_thread_reply` with flush wrapper (minimal lifecycle events)
- [x] 3.6 Add slack-app tests for correlation header, outgoingDomains OTLP host, and flush-on-return behavior (mock fetch)
- [x] 3.7 Update `slack-app/.env.example` with OTLP variables

## 4. Deploy and configuration

- [x] 4.1 Add OTLP env vars to GitHub Actions Render sync job (`OTEL_EXPORTER_OTLP_*`, `OTEL_LOGS_ENABLED`, `OTEL_SERVICE_NAME`)
- [x] 4.2 Add OTLP env vars to slack-app deploy job via `slack env set`
- [x] 4.3 Document new GitHub Secret/Variable in workflow env guard step
- [x] 4.4 Update `render.yaml` env var key list (no secret values)

## 5. Tests (scenario coverage)

- [x] 5.1 Test: logging disabled when `OTEL_LOGS_ENABLED` not true (observability spec — Logging disabled)
- [x] 5.2 Test: correlation header sent and read (observability spec — Correlation header / Agent reads)
- [x] 5.3 Test: forbidden fields not present in exported payload (observability spec — Forbidden fields excluded)
- [x] 5.4 Test: outgoingDomains includes OTLP hostname (infrastructure spec — OTLP hostname in outgoingDomains)
- [x] 5.5 Run `npm test` and `cd slack-app && deno task test` — all pass

## 6. Documentation

- [x] 6.1 Update README with Grafana OTLP setup, GitHub Secrets inventory, and Grafana Explore query examples
- [x] 6.2 Update `docs/tech-stack-requirements.md` with observability env vars and redaction policy
- [x] 6.3 Update `agent-service/README.md` with OTLP configuration section

## 7. Changelog

- [x] 7.1 Create or update changelog entry for Grafana OTLP logging
- [x] 7.2 Confirm entry covers observability capability and deploy secret changes
