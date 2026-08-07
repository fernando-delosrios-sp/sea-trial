# Deployment — development

## Prerequisites
- [x] Document complete (obtain playbooks)
- [x] Harvest finished — `.env` complete (deploy blocked until done)

## Overview

Development deploys via GitHub Actions manual workflow trigger. Two sequential jobs:
1. **agent-service** — Render env sync → deploy → health check
2. **slack-app** — Deno Slack SDK deploy via `slack deploy` → provision triggers from `triggers.config.yaml`

All configuration stored in GitHub Secrets (tokens, keys) and Variables (URLs, IDs). Render syncs env vars via API before deploy trigger.

## Steps

### Pre-deploy
1. Confirm `.deploy-mate/development/.env` has all required values (15 vars)
2. Verify Render service is healthy: `curl -fsS https://tes-agent-service.onrender.com/health`
3. Verify Slack app is installed to dev workspace

### Deploy via GitHub Actions
1. Open repository → **Actions → Deploy → Run workflow**
2. Confirm workflow logs show:
   - Render env sync successful (7 env vars pushed)
   - Render deploy triggered
   - Health check passed (up to 30 retries, 10s interval)
   - slack-app deploy successful
   - Slack triggers provisioned (`provision-triggers.sh`)
3. Check Render dashboard for deploy completion

Optional GitHub Variable for channel-scoped triggers:
- `SLACK_TRIGGER_CHANNEL_IDS` — comma-separated channel IDs used when a trigger entry has `scope: channel` and empty inline `channels` in `slack-app/triggers.config.yaml`

### Post-deploy validation
1. Run [smoke test checklist](docs/smoke-test-checklist.md)
2. Verify agent-service health: `GET https://tes-agent-service.onrender.com/health`
3. Test Slack app interaction in dev workspace
4. If OTEL enabled, verify logs in Grafana Explore

## Generated files

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | CI/CD workflow — validates config, deploys agent-service, slack-app, and provisions triggers |
| `slack-app/triggers.config.yaml` | Declarative Slack trigger scope and channel configuration |
| `slack-app/scripts/provision-triggers.sh` | Idempotent trigger create/update after deploy |
| `render.yaml` | Render service definition — build/start commands, env var declarations |
| `.deploy-mate/development/.env` | Collected environment values (gitignored, chmod 600) |

## Env var references

Names only — values in `.deploy-mate/development/.env`:

### agent-service (Render)
- `LLM_API_KEY` — OpenAI-compatible API key
- `LLM_BASE_URL` — LLM provider endpoint
- `LLM_MODEL` — Model identifier
- `OTEL_EXPORTER_OTLP_ENDPOINT` — Grafana OTLP URL (when logging enabled)
- `OTEL_EXPORTER_OTLP_HEADERS` — Grafana auth header (when logging enabled)
- `OTEL_LOGS_ENABLED` — Toggle for log export
- `OTEL_SERVICE_NAME` — `tes-agent-service`
- `PORT` — Local dev only (Render sets automatically)
- `OTEL_RESOURCE_ATTRIBUTES` — Resource tags (local dev)

### slack-app (Slack-managed)
- `AGENT_SERVICE_URL` — Public HTTPS URL of agent-service
- `SLACK_BOT_TOKEN` — Bot user OAuth token (placeholder; local-dev only)
- `SLACK_APP_TOKEN` — App-level token (placeholder; local-dev only)
- `SLACK_SERVICE_TOKEN` — CLI service token (CI/CD only)

### CI/CD infrastructure
- `RENDER_API_KEY` — Render API authentication
- `RENDER_DEPLOY_HOOK_URL` — Deploy trigger URL
- `RENDER_SERVICE_ID` — Render service identifier

## Rollback

1. Restore previous secret/variable values in GitHub repository settings
2. Re-run Deploy workflow
3. CI logs record who triggered each deploy
4. No database migration rollback needed (state lives in Slack)

## Optional

### Observability
- When `OTEL_LOGS_ENABLED=true`, both services push to Grafana Cloud
- Correlation via `X-Correlation-Id` header from slack-app to agent-service
- Grafana Explore queries: `{service_name="tes-slack-app"}` and `{service_name="tes-agent-service"}`

### DNS
- Render provides `*.onrender.com` subdomain — no custom DNS for development

### Migrations
- None required — Slack canvases/lists are source of truth, no external database

