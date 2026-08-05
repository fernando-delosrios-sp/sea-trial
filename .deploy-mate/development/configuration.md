# Configuration — development

## Tooling

| Deploy target | MCP / skill | Notes |
|---------------|-------------|-------|
| agent-service → Render | Render MCP (available) | `list_services`, `get_service`, `update_environment_variables`, `trigger_deploy`, `create_web_service` |
| slack-app → Slack-managed infra | Slack CLI (agent-only); Composio Slack tools available | Deployed via `slack deploy` — CI uses `SLACK_SERVICE_TOKEN`. Composio can manage Slack API operations post-deploy |
| CI/CD → GitHub Actions | Composio GitHub tools (available) | Can manage secrets, variables, trigger workflows, manage repos |
| LLM API | agent-only (no deploy tooling) | Env-driven; provider chosen via `LLM_BASE_URL` |
| Grafana Cloud OTLP | agent-only (no deploy tooling) | Env-driven observability pipeline |

## Environment variables

### agent-service (Render)

| Name | Required | Purpose | How to obtain | Consumed by |
|------|----------|---------|---------------|-------------|
| `LLM_API_KEY` | yes | OpenAI-compatible API key for LLM calls | Provider dashboard (OpenAI, Azure, etc.) | LangChain LLM client |
| `LLM_BASE_URL` | no (default `https://api.openai.com/v1`) | Base URL for OpenAI-compatible API | Provider dashboard | LangChain LLM client |
| `LLM_MODEL` | no (default `gpt-4o`) | Model identifier for LLM | Provider docs | LangChain LLM client |
| `PORT` | no (default `3000`) | HTTP server port | Render sets automatically in prod | Node HTTP server |
| `OTEL_LOGS_ENABLED` | no (default `false`) | Kill switch for OTLP log export | Set to `true` to enable | Logger pipeline |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | when logging enabled | Grafana Cloud OTLP base URL | Grafana Cloud dashboard → OTLP endpoint | OTLP HTTP exporter |
| `OTEL_EXPORTER_OTLP_HEADERS` | when logging enabled | Authorization header for Grafana Cloud | Grafana Cloud → OTLP credentials | OTLP HTTP exporter |
| `OTEL_SERVICE_NAME` | no (default `tes-agent-service`) | Service name for log identification | Project convention | OTLP log metadata |
| `OTEL_RESOURCE_ATTRIBUTES` | no | Additional resource tags (e.g. `deployment.environment=dev`) | Project convention | OTLP log metadata |

### slack-app (Slack-managed infra)

| Name | Required | Purpose | How to obtain | Consumed by |
|------|----------|---------|---------------|-------------|
| `AGENT_SERVICE_URL` | yes | Public HTTPS base URL of deployed agent-service | From Render dashboard or custom domain | `agent-client.ts` → HTTP calls |
| `OTEL_LOGS_ENABLED` | no (default `false`) | Kill switch for OTLP log export | Set to `true` to enable | Logger pipeline |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | when logging enabled | Grafana Cloud OTLP base URL | Grafana Cloud dashboard | OTLP HTTP exporter |
| `OTEL_EXPORTER_OTLP_HEADERS` | when logging enabled | Authorization header for Grafana Cloud | Grafana Cloud → OTLP credentials | OTLP HTTP exporter |
| `OTEL_SERVICE_NAME` | no (default `tes-slack-app`) | Service name for log identification | Project convention | OTLP log metadata |
| `SLACK_BOT_TOKEN` | yes (deployed app) | Slack bot token for API calls | Slack app dashboard → OAuth & Permissions | Slack SDK client |
| `SLACK_APP_TOKEN` | yes (deployed app) | Slack app-level token for socket mode | Slack app dashboard → Basic Info | Slack SDK client |

### CI/CD (GitHub Actions)

| Name | Type | Required | Purpose |
|------|------|----------|---------|
| `LLM_API_KEY` | Secret | yes | Passed to Render env var sync |
| `SLACK_SERVICE_TOKEN` | Secret | yes | Authenticates `slack deploy` command |
| `RENDER_API_KEY` | Secret | yes | Authenticates Render API calls (env sync, deploy trigger) |
| `RENDER_DEPLOY_HOOK_URL` | Secret | yes | Render deploy hook URL for agent-service |
| `OTEL_EXPORTER_OTLP_HEADERS` | Secret | when logging enabled | Grafana Cloud auth header for both services |
| `AGENT_SERVICE_URL` | Variable | yes | Public URL of agent-service; also set on slack-app |
| `LLM_BASE_URL` | Variable | yes | OpenAI-compatible API base URL |
| `LLM_MODEL` | Variable | yes | LLM model identifier |
| `RENDER_SERVICE_ID` | Variable | yes | Render service ID for env var API calls |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Variable | when logging enabled | Grafana Cloud OTLP endpoint for both services |
| `OTEL_LOGS_ENABLED` | Variable | no (default `false`) | Kill switch for OTLP logging |

## MCP setup notes
- **Render MCP** — Available in this session. Can manage agent-service env vars and deploys directly if needed.
- **Composio (GitHub, Slack)** — Available in this session. Can manage GitHub secrets/variables and Slack operations. Requires OAuth connection setup before use.
