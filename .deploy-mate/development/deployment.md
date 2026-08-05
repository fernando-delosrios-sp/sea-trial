# Deployment — development

## Prerequisites
- [x] 4a configuration docs complete
- [ ] `.env` complete (deploy blocked until done)

## Overview

The deployment pipeline uses **GitHub Actions** (manual `workflow_dispatch`) to deploy both services:

| Service | Platform | Method |
|---------|----------|--------|
| **agent-service** | Render (free web service, Node 20) | Deploy hook + env var sync via Render API |
| **slack-app** | Slack-managed infra (Deno Slack SDK) | `slack deploy` via Slack CLI with service token |

No Dockerfile needed — Render uses the Node runtime natively. No docker-compose — services deploy independently.

## Steps

### 1. Configure GitHub Secrets and Variables

Set these in the repository **Settings → Secrets and Variables → Actions**:

**Secrets:**
```
LLM_API_KEY              — OpenAI-compatible API key
SLACK_SERVICE_TOKEN      — Slack CLI service token
RENDER_API_KEY           — Render API key
RENDER_DEPLOY_HOOK_URL   — Render deploy hook URL
OTEL_EXPORTER_OTLP_HEADERS — Grafana Cloud auth (if logging enabled)
```

**Variables:**
```
AGENT_SERVICE_URL        — e.g. https://tes-agent.onrender.com
LLM_BASE_URL             — e.g. https://opencode.ai/zen/go/v1
LLM_MODEL                — e.g. deepseek-v4-pro
RENDER_SERVICE_ID        — Render web service ID
OTEL_EXPORTER_OTLP_ENDPOINT — Grafana Cloud OTLP endpoint (if logging enabled)
OTEL_LOGS_ENABLED        — "true" or "false"
```

### 2. Trigger deployment

1. Open **GitHub → Actions → Deploy → Run workflow**
2. The workflow validates config, syncs Render env vars, deploys agent-service, waits for health check, then deploys slack-app

### 3. Verify

- `GET <agent-service-url>/health` → `{ "status": "ok" }`
- Slack app responds to `@mention` with agent invocation
- Both services push OTLP logs when `OTEL_LOGS_ENABLED=true`

### Local development (non-deploy)

```bash
# agent-service
cp agent-service/.env.example agent-service/.env
# Set LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
npm run dev:agent

# slack-app (in another terminal)
cd slack-app
cp .env.example .env
# AGENT_SERVICE_URL defaults to http://localhost:3000
slack run
```

## Generated files

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | GitHub Actions manual deploy workflow |
| `render.yaml` | Render web service config (Node runtime, env vars, health check) |
| `agent-service/.env.example` | agent-service env var template |
| `slack-app/.env.example` | slack-app env var template |
| `.deploy-mate/development/.env` | Development env values (gitignored) |

## Env var references

Names only — values in `.deploy-mate/development/.env`:

**agent-service:**
- `LLM_API_KEY` — used by LangChain LLM client
- `LLM_BASE_URL` — used by LangChain LLM client
- `LLM_MODEL` — used by LangChain LLM client
- `PORT` — used by Node HTTP server
- `OTEL_LOGS_ENABLED` — used by logger pipeline
- `OTEL_EXPORTER_OTLP_ENDPOINT` — used by OTLP exporter
- `OTEL_EXPORTER_OTLP_HEADERS` — used by OTLP exporter
- `OTEL_SERVICE_NAME` — used by OTLP log metadata
- `OTEL_RESOURCE_ATTRIBUTES` — used by OTLP log metadata

**slack-app:**
- `AGENT_SERVICE_URL` — used by agent-client.ts
- `OTEL_LOGS_ENABLED` — used by logger pipeline
- `OTEL_EXPORTER_OTLP_ENDPOINT` — used by OTLP exporter
- `OTEL_EXPORTER_OTLP_HEADERS` — used by OTLP exporter
- `OTEL_SERVICE_NAME` — used by OTLP log metadata
- `SLACK_BOT_TOKEN` — used by Slack SDK
- `SLACK_APP_TOKEN` — used by Slack SDK

**CI/CD (GitHub):**
- `LLM_API_KEY` (secret) — synced to Render
- `SLACK_SERVICE_TOKEN` (secret) — authenticates `slack deploy`
- `RENDER_API_KEY` (secret) — authenticates Render API
- `RENDER_DEPLOY_HOOK_URL` (secret) — triggers Render deploy
- `AGENT_SERVICE_URL` (variable) — set on slack-app via `slack env set`
- `LLM_BASE_URL` (variable) — synced to Render
- `LLM_MODEL` (variable) — synced to Render
- `RENDER_SERVICE_ID` (variable) — target for Render env var API
- `OTEL_EXPORTER_OTLP_ENDPOINT` (variable) — synced to both services
- `OTEL_EXPORTER_OTLP_HEADERS` (secret) — synced to both services
- `OTEL_LOGS_ENABLED` (variable) — synced to both services

## Rollback

1. Re-run the **Deploy** GitHub Actions workflow — previous code deploys from the current main branch.
2. If env vars caused the issue, restore previous values in GitHub Secrets/Variables first, then re-deploy.
3. CI logs record who triggered each deploy and commit SHA.
4. For Render: use the Render dashboard to activate a previous deploy if the GitHub workflow is insufficient.

## Observability

OTLP logging is optional (controlled by `OTEL_LOGS_ENABLED`). When enabled, both services push structured logs to Grafana Cloud. slack-app generates a `correlationId` per invocation and sends it as `X-Correlation-Id` to agent-service so logs can be joined in Explore.

Logs contain metadata only (file counts, parse outcomes, durations) — never document content, canvas markdown, or LLM prompts.

## Migrations

No database migrations — all state lives in Slack canvases and lists.
