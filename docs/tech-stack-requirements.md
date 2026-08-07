# Tech Stack Requirements

Reference captured from infrastructure exploration (2026-08-04). Normative requirements live in `openspec/specs/infrastructure/spec.md`.

## Architecture

```
┌──────────── Slack Pro workspace (MVP) ─────────────────────────┐
│  slack-app  →  Deno Slack SDK on Slack-managed infrastructure   │
│    Canvas / Lists / Files / @mention / modals / workflows       │
└──────────────────────────┬─────────────────────────────────────┘
                           │ HTTPS (Slack Function → agent-service)
                           ▼
┌──────────── Render free web service (MVP) ─────────────────────┐
│  agent-service  →  Node.js 20+, LangGraph.js                    │
│    POST /agents/requirements/process                            │
└────────────┬────────────────────────────────────────────────────┘
             │ LLM_BASE_URL + LLM_API_KEY
             ▼
      OpenAI-compatible API

packages/shared/  — TypeScript types (HTTP contract, both runtimes)
No external database — Slack canvases and lists are source of truth
```

Deploy configuration is sourced from **GitHub Secrets and Variables** and applied via the [Deploy workflow](../README.md#deploy-via-github-actions).

## Tech stack

| Layer | Choice | Host |
|-------|--------|------|
| Language | TypeScript | Both runtimes |
| Slack app | Deno Slack SDK | Slack-managed infra |
| Agent runtime | Node.js 20+ | Render (MVP) → AWS/Azure (prod) |
| Agent framework | LangGraph.js | agent-service |
| Monorepo | npm workspaces | Local / CI |
| State | Slack Canvas + Lists | Slack only |

## Subscriptions and accounts

### Required for MVP

| Service | Purpose | Cost (MVP) |
|---------|---------|------------|
| **Slack Pro** | Canvas, Lists, app deploy | Existing license |
| **Slack app** (custom) | Bot, workflows, scopes | Included |
| **LLM API** | Requirements Agent | Pay-per-token |
| **Render** | agent-service hosting | Free tier |
| **GitHub Actions** | Deploy automation | Included with repo |
| **Deno + Slack CLI** | Local dev | Free |

### Required for production (post-MVP)

| Service | Purpose |
|---------|---------|
| **Slack Enterprise Grid** | Org-wide install, SSO, audit |
| **Grid admin allowlist** | Outbound domains: LLM, agent-service |
| **AWS or Azure** | Company-standard agent-service hosting |

### Not required (MVP)

- External database
- Salesforce integration (phase 2)
- OCR service
- Vercel (Render preferred for long agent runs)

## Environment variables

Deployed values are set by GitHub Actions (see [README](../README.md#deploy-via-github-actions)). Local dev uses gitignored `.env` files.

### agent-service

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_API_KEY` | Yes | API key for OpenAI-compatible provider |
| `LLM_BASE_URL` | Yes | API base URL (e.g. `https://api.openai.com/v1`, Azure endpoint) |
| `LLM_MODEL` | Yes | Model identifier (e.g. `gpt-4o`) |
| `PORT` | No | HTTP port (Render sets automatically) |

### Observability (Grafana Cloud OTLP)

| Variable | Required | Description |
|----------|----------|-------------|
| `OTEL_LOGS_ENABLED` | No | Set to `true` to push logs (`false` default locally) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | When logging enabled | Grafana Cloud OTLP base URL |
| `OTEL_EXPORTER_OTLP_HEADERS` | When logging enabled | Authorization header (`Authorization=Basic%20...`) |
| `OTEL_SERVICE_NAME` | No | `tes-agent-service` or `tes-slack-app` |
| `OTEL_RESOURCE_ATTRIBUTES` | No | Optional resource tags (e.g. `deployment.environment=prod`) |

**Redaction policy:** Logs MUST NOT contain file bytes, canvas markdown, LLM prompts/responses, or API tokens. Only metadata (correlation ID, channel ID, file counts, parse status, durations) is exported.

### slack-app

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_SERVICE_URL` | Yes | Public HTTPS base URL of deployed agent-service |
| Slack tokens | Yes | Provided by Deno Slack SDK / manifest deploy |

## Slack scopes

```
channels:manage
canvases:read / canvases:write
lists:read / lists:write
files:read
users:read
chat:write
```

## Slack tenant checklist

Pro license confirmed (2026-08-04). Remaining setup verification:

- [ ] App created via Slack CLI
- [ ] Custom app install permitted for developers
- [ ] Outbound HTTPS allowed (Slack Functions → Render URL)
- [ ] API spike: `canvases.create` + `slacklists.create` return 200

## Cost estimate (MVP dev)

| Item | Monthly |
|------|---------|
| Slack Pro | Existing |
| Render | $0 (free tier; ~1 min cold start after idle) |
| LLM API | ~$5–20 usage-dependent |
| **Total infra** | **~$0 + LLM usage** |

Upgrade Render to Starter ($7/mo) when always-on demos are needed.

## Deferred decisions

- Data residency / customer-data handling (future phase)
- Exact AWS vs Azure target
- LLM vendor selection (env-driven; use first available company-approved key)

## Related artifacts

- `openspec/specs/infrastructure/spec.md` — normative requirements
- [Infrastructure setup checklist](./infrastructure-setup-checklist.md) — step-by-step setup
- [Smoke test checklist](./smoke-test-checklist.md) — post-deploy verification
