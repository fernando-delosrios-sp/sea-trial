# Grafana OTLP Logging — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Push structured logs from slack-app and agent-service to Grafana Cloud via OTLP HTTP, with correlation IDs joining cross-service requests in Explore.

**Architecture:** Shared `packages/observability` defines log events, redaction, and OTLP payload shape. agent-service uses OpenTelemetry Logs SDK; slack-app uses fetch-based OTLP push with mandatory flush before function return. GitHub Actions deploy syncs OTLP secrets to Render and slack-app; manifest allowlists the OTLP gateway hostname.

**Tech Stack:** OpenTelemetry Logs (Node), Deno fetch OTLP, Grafana Cloud OTLP gateway, npm workspaces, GitHub Actions

**Canonical test commands:**
- Monorepo: `npm test` (from repo root)
- Slack-app: `cd slack-app && deno task test`

---

## Task 1: packages/observability scaffold

**Files:** `packages/observability/package.json`, `src/types.ts`, `src/correlation.ts`, `src/redact.ts`, `src/otlp.ts`, `tests/redact.test.ts`

- [ ] **Step 1:** Write failing test — `redact()` removes `contentBase64`, `requirementsCanvasMarkdown`, `content`, and nested sensitive keys
  ```bash
  npm test -w @tes-event-process/observability
  ```
- [ ] **Step 2:** Create package with exports: `LogEvent`, `createCorrelationId()`, `redact()`, `buildOtlpLogsPayload()`
- [ ] **Step 3:** Run test — expect PASS
- [ ] **Step 4:** Add workspace to root `package.json` and `npm run build` dependency order
- [ ] **Step 5:** Commit: `feat(observability): shared log types, redaction, and OTLP payload builder`

---

## Task 2: Agent-service OTel init and correlation

**Files:** `agent-service/src/observability/logger.ts`, `agent-service/src/server.ts`, `agent-service/tests/server.test.ts`

- [ ] **Step 1:** Write failing test — POST with `X-Correlation-Id: test-id` causes log attributes to include `correlationId: test-id` (mock exporter or spy)
- [ ] **Step 2:** Add fetch-based OTLP logger using `@tes-event-process/observability` payload builder
- [ ] **Step 3:** Implement `initLogger()` — no-op when `OTEL_LOGS_ENABLED !== "true"`
- [ ] **Step 4:** In `handleRoute`, read header, create request logger, emit `request.received`
- [ ] **Step 5:** Run test — expect PASS
- [ ] **Step 6:** Commit: `feat(agent-service): OTel logs init and correlation header`

---

## Task 3: Agent-service lifecycle log events

**Files:** `agent-service/src/agents/requirements/graph.ts`, `agent-service/tests/agent-rules.test.ts` or dedicated observability test

- [ ] **Step 1:** Write failing test — successful process emits `documents.parsed` and `agent.completed` with proposal count, no document text in attributes
- [ ] **Step 2:** Instrument parse node and graph completion/failure paths
- [ ] **Step 3:** Run `npm test` — expect PASS
- [ ] **Step 4:** Update `agent-service/.env.example`
- [ ] **Step 5:** Commit: `feat(agent-service): lifecycle log events with redaction`

---

## Task 4: Slack-app logger and outgoingDomains

**Files:** `slack-app/lib/logger.ts`, `slack-app/lib/outgoing-domains.ts`, `slack-app/tests/outgoing_domains_test.ts` (new)

- [ ] **Step 1:** Write failing test — `buildOutgoingDomains(url, otlpEndpoint)` includes both agent host and `otlp-gateway-prod-eu-west-6.grafana.net`
  ```bash
  cd slack-app && deno task test
  ```
- [ ] **Step 2:** Implement `createLogger(env)` with fetch OTLP push, flush, 2s timeout, fail-open
- [ ] **Step 3:** Extend `buildOutgoingDomains` to parse OTLP endpoint hostname
- [ ] **Step 4:** Update `manifest.ts` to pass `Deno.env.get("OTEL_EXPORTER_OTLP_ENDPOINT")`
- [ ] **Step 5:** Run test — expect PASS
- [ ] **Step 6:** Commit: `feat(slack-app): OTLP logger and outgoing domain for Grafana gateway`

---

## Task 5: Slack-app invoke_agent instrumentation

**Files:** `slack-app/lib/agent-client.ts`, `slack-app/functions/invoke_agent/mod.ts`, `slack-app/tests/agent_invoke_test.ts`

- [ ] **Step 1:** Write failing test — `callRequirementsAgent` sends `X-Correlation-Id` header
- [ ] **Step 2:** Generate correlationId in invoke_agent; wrap handler with try/finally flush
- [ ] **Step 3:** Emit `invoke.started`, `invoke.completed`, `invoke.failed` with safe metadata only
- [ ] **Step 4:** Run test — expect PASS
- [ ] **Step 5:** Commit: `feat(slack-app): invoke_agent structured logging and correlation`

---

## Task 6: Secondary slack-app functions + deploy wiring

**Files:** `slack-app/functions/accept_proposals/mod.ts`, `slack-app/functions/handle_thread_reply/mod.ts`, `.github/workflows/deploy.yml`, `render.yaml`

- [ ] **Step 1:** Add flush wrapper to accept_proposals and handle_thread_reply
- [ ] **Step 2:** Extend deploy workflow Render sync and `slack env set` for OTLP vars (masked secret for headers)
- [ ] **Step 3:** Add env guard for OTLP vars when `OTEL_LOGS_ENABLED=true` in workflow (optional strict mode)
- [ ] **Step 4:** Update `render.yaml` env key list
- [ ] **Step 5:** Commit: `ci: sync OTLP env vars for Grafana logging`

---

## Task 7: Documentation and verification

**Files:** `README.md`, `docs/tech-stack-requirements.md`, `agent-service/README.md`, `CHANGELOG.md`

- [ ] **Step 1:** Document GitHub Secret `OTEL_EXPORTER_OTLP_HEADERS`, vars, kill switch, and sample Grafana Explore query:
  `{service_name="tes-slack-app"} | correlationId="<id>"`
- [ ] **Step 2:** Run full test suite: `npm test` and `cd slack-app && deno task test`
- [ ] **Step 3:** Mark tasks.md checkboxes complete
- [ ] **Step 4:** Commit: `docs: Grafana OTLP observability setup`

**Note:** E2E log verification requires deployed env with rotated Grafana token in GitHub Secrets — document as post-merge ops step.
