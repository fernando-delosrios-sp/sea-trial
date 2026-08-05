# Configuration — development

## Tooling

### Deploy tooling

| Deploy target | MCP / skill | Notes |
|---------------|-------------|-------|
| Render | Render MCP (available) | API key auth, env var sync, deploy trigger |
| Slack | — | `slack` CLI (Deno-based) with service token |
| GitHub Actions | — | Workflow already exists; secrets/variables managed via GitHub UI or `gh` CLI |

### Collection tooling

| Source service | Vars | MCP / skill | Local CLI | Primary method | Status |
|----------------|------|-------------|-----------|----------------|--------|
| Render | `RENDER_API_KEY`, `RENDER_SERVICE_ID`, `RENDER_DEPLOY_HOOK_URL` | Render MCP | `render` CLI (via API) | cli → mcp → manual | pending |
| Slack | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SERVICE_TOKEN` | — | `slack` CLI | cli → manual | pending |
| OpenAI-compatible LLM | `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` | — | — | manual | pending |
| Grafana Cloud | `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` | — | — | manual | pending |

## Scaffold registry

No scaffolded resources needed — all platform resources already exist for development.

| Resource | Platform | ID / name | Created | Unblocks vars |
|----------|----------|-----------|---------|---------------|
| agent-service | Render | srv-d9peld2jnfac73eho7h0 | pre-existing | all agent-service env vars |
| slack-app | Slack | dev app (pre-installed) | pre-existing | all slack-app tokens |

## CLI setup notes

### Render MCP
- Server: `render` (MCP server available in session)
- Auth: `RENDER_API_KEY` (already set in .env)
- Status: to be verified in Arm-ready

### slack CLI
- Not yet checked — pending Arm-ready

### gh CLI
- Not yet checked — pending Arm-ready

## Environment variables

| Name | Class | Required | Source service | Document | Harvest |
|------|-------|----------|----------------|----------|---------|
| `LLM_API_KEY` | secret | yes | OpenAI-compatible LLM | done | done |
| `LLM_BASE_URL` | config | yes | OpenAI-compatible LLM | done | done |
| `LLM_MODEL` | config | yes | OpenAI-compatible LLM | done | done |
| `PORT` | config | no (default: `3000`) | agent-service | done | done |
| `OTEL_LOGS_ENABLED` | config | no (default: `false`) | Grafana Cloud | done | done |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | config | when logging | Grafana Cloud | done | done |
| `OTEL_EXPORTER_OTLP_HEADERS` | secret | when logging | Grafana Cloud | done | done |
| `OTEL_SERVICE_NAME` | config | no (default: `tes-agent-service`) | agent-service | done | done |
| `OTEL_RESOURCE_ATTRIBUTES` | config | no | agent-service | done | done |
| `AGENT_SERVICE_URL` | config | yes | Render | done | done |
| `SLACK_BOT_TOKEN` | secret | yes | Slack | done | done |
| `SLACK_APP_TOKEN` | secret | yes | Slack | done | done |
| `SLACK_SERVICE_TOKEN` | secret | yes | Slack | done | done |
| `RENDER_API_KEY` | secret | yes | Render | done | done |
| `RENDER_DEPLOY_HOOK_URL` | config | yes | Render | done | done |
| `RENDER_SERVICE_ID` | config | yes | Render | done | done |

---

### `LLM_API_KEY`

| Field | Value |
|-------|-------|
| Class | secret |
| Required | yes |
| Consumed by | `agent-service` — cite `agent-service/.env.example:2`, `render.yaml:10` |
| Purpose | API key for OpenAI-compatible LLM provider — agent cannot process requests without it |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | none |

#### How to obtain

1. Open your company's secret manager or LLM provider dashboard → navigate to API keys section
2. **Prerequisite:** account with LLM provider (OpenAI, Azure, or company-approved vendor)
3. **Create or locate:** generate a new API key or copy existing key from dashboard
4. **Copy:** the full key string (typically starts with `sk-`)
5. **Scope:** development environment — use provider's test/dev key if available

#### Format & validation

- **Shape:** `sk-…` or vendor-specific prefix (varies by provider)
- **Constraints:** 40-100 chars, alphanumeric + dashes
- **Verify:**
```bash
curl -s -H "Authorization: Bearer $LLM_API_KEY" "$LLM_BASE_URL/models" | jq '.data[0].id'
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | GitHub Secret → `deploy.yml` → Render API `PUT /env-vars` |
| Local dev | `.env` file in agent-service |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [ ] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `LLM_BASE_URL`

| Field | Value |
|-------|-------|
| Class | config |
| Required | yes |
| Consumed by | `agent-service` — cite `agent-service/.env.example:3`, `render.yaml:12` |
| Purpose | Base URL for LLM API endpoint — determines which provider is used |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | none |

#### How to obtain

1. Identify the approved LLM provider for development (OpenAI, Azure, or internal)
2. Open provider documentation → locate API endpoint URL
3. **Copy:** the base URL (e.g. `https://api.openai.com/v1` or Azure endpoint)
4. **Scope:** development environment — may differ from production URL
5. Format: must be a valid HTTPS URL with no trailing path beyond `/v1`

#### Format & validation

- **Shape:** `https://…` URL
- **Constraints:** must end with API version path (e.g. `/v1`, `/openai/deployments`)
- **Verify:**
```bash
curl -s "$LLM_BASE_URL/models" | jq -r '.data[0].id' # expects model list JSON
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | GitHub Variable → `deploy.yml` → Render API `PUT /env-vars` |
| Local dev | `agent-service/.env` |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [ ] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `LLM_MODEL`

| Field | Value |
|-------|-------|
| Class | config |
| Required | yes |
| Consumed by | `agent-service` — cite `agent-service/.env.example:4`, `render.yaml:14` |
| Purpose | Model identifier for LLM inference — must match provider's available models |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | none |

#### How to obtain

1. Open LLM provider dashboard or documentation
2. Navigate to models list → select the approved model for development
3. **Copy:** the model identifier string (e.g. `gpt-4o`, `claude-3-5-sonnet`)
4. **Scope:** must be available in the account linked to `LLM_API_KEY`
5. Verify model supports the required capabilities (function calling, context window)

#### Format & validation

- **Shape:** string identifier (e.g. `gpt-4o`, `deepseek-v4-pro`)
- **Constraints:** must match exact model name in provider's catalog
- **Verify:**
```bash
curl -s -H "Authorization: Bearer $LLM_API_KEY" "$LLM_BASE_URL/models" | jq -r '.data[].id' | grep "$LLM_MODEL"
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | GitHub Variable → `deploy.yml` → Render API `PUT /env-vars` |
| Local dev | `agent-service/.env` |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [ ] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `PORT`

| Field | Value |
|-------|-------|
| Class | config |
| Required | no (default: `3000`) |
| Consumed by | `agent-service` — cite `agent-service/.env.example:7` |
| Purpose | HTTP port for local development — Render sets automatically in production |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | none |

#### How to obtain

1. Open `agent-service/.env.example` → find `PORT=3000`
2. Use default value `3000` for local development
3. **Copy:** `3000` as the port number
4. **Scope:** local development only — Render ignores this in production
5. No provider account needed — this is an app-level config

#### Format & validation

- **Shape:** integer 1024-65535
- **Constraints:** must be available on local machine
- **Verify:**
```bash
lsof -i :3000 || echo "Port 3000 is available"
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | Ignored — Render sets `$PORT` automatically |
| Local dev | `agent-service/.env` |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [x] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `OTEL_LOGS_ENABLED`

| Field | Value |
|-------|-------|
| Class | config |
| Required | no (default: `false`) |
| Consumed by | `agent-service`, `slack-app` — cite `agent-service/.env.example:10`, `slack-app/.env.example:6` |
| Purpose | Toggle for Grafana Cloud OTLP log export — `false` disables observability |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | none |

#### How to obtain

1. Decide whether development environment should push logs to Grafana Cloud
2. Open project config → `docs/tech-stack-requirements.md` for guidance
3. **Copy:** `true` to enable, `false` to disable (default)
4. **Scope:** affects both agent-service and slack-app
5. No external account needed for `false` — only needed when `true`

#### Format & validation

- **Shape:** boolean string `"true"` or `"false"`
- **Constraints:** case-sensitive lowercase
- **Verify:** check in Grafana Explore if logs appear after deploy

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | GitHub Variable → `deploy.yml` → Render API `PUT /env-vars` |
| Slack | GitHub Variable → `slack env set` in deploy workflow |
| Local dev | `.env` files |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [x] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `OTEL_EXPORTER_OTLP_ENDPOINT`

| Field | Value |
|-------|-------|
| Class | config |
| Required | when `OTEL_LOGS_ENABLED=true` |
| Consumed by | `agent-service`, `slack-app` — cite `agent-service/.env.example:11`, `slack-app/.env.example:7` |
| Purpose | Grafana Cloud OTLP HTTP endpoint URL — base URL for log ingestion |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | Grafana Cloud account |

#### How to obtain

1. Open `https://grafana.com/` → log in to your Grafana Cloud account
2. Navigate to **Connections → Data Sources → Grafana OTLP** or **https://grafana.com/orgs/<your-org>/alerting/otlp**
3. **Copy:** the OTLP endpoint URL (format: `https://otlp-gateway-prod-<region>.grafana.net/otlp`)
4. **Scope:** specific to your Grafana Cloud org and region
5. If not set up, create a Grafana Cloud account (free tier available) and enable OTLP ingestion

#### Format & validation

- **Shape:** `https://otlp-gateway-prod-<region>.grafana.net/otlp`
- **Constraints:** valid HTTPS URL, Grafana Cloud domain
- **Verify:**
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "$OTEL_EXPORTER_OTLP_ENDPOINT/v1/logs" -H "Content-Type: application/json" -d '{"resourceLogs":[]}' -H "$OTEL_EXPORTER_OTLP_HEADERS"
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | GitHub Variable → `deploy.yml` → Render API `PUT /env-vars` |
| Slack | GitHub Variable → `slack env set` in deploy workflow |
| Local dev | `.env` files |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [ ] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `OTEL_EXPORTER_OTLP_HEADERS`

| Field | Value |
|-------|-------|
| Class | secret |
| Required | when `OTEL_LOGS_ENABLED=true` |
| Consumed by | `agent-service`, `slack-app` — cite `agent-service/.env.example:12`, `slack-app/.env.example:8` |
| Purpose | Grafana Cloud authorization header — contains Base64-encoded instance ID + API key |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | Grafana Cloud account |

#### How to obtain

1. Open `https://grafana.com/orgs/<your-org>/alerting/otlp`
2. Navigate to **OTLP → HTTP endpoint** section
3. **Copy:** the `Authorization` header value (format: `Authorization=Basic <base64-string>`)
4. **Scope:** specific to your Grafana Cloud org — grants log write access
5. Keep secret — rotating requires updating GitHub Secret and redeploying

#### Format & validation

- **Shape:** `Authorization=Basic <base64>` or just `Basic <base64>` (depending on SDK)
- **Constraints:** URL-encoded if used as env var value
- **Verify:**
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "$OTEL_EXPORTER_OTLP_ENDPOINT/v1/logs" -H "Content-Type: application/json" -d '{"resourceLogs":[]}' -H "$OTEL_EXPORTER_OTLP_HEADERS"
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | GitHub Secret → `deploy.yml` → Render API `PUT /env-vars` |
| Slack | GitHub Secret → `slack env set` in deploy workflow |
| Local dev | `.env` files |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [ ] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `OTEL_SERVICE_NAME`

| Field | Value |
|-------|-------|
| Class | config |
| Required | no (default: `tes-agent-service` or `tes-slack-app`) |
| Consumed by | `agent-service` (`tes-agent-service`), `slack-app` (`tes-slack-app`) — cite `agent-service/.env.example:13`, `slack-app/.env.example:9` |
| Purpose | Service name label for Grafana Cloud log correlation |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | none |

#### How to obtain

1. Open project README → observability section for naming convention
2. Use `tes-agent-service` for agent-service, `tes-slack-app` for slack-app
3. **Copy:** the service name string
4. **Scope:** must match between env var and Grafana Explore queries
5. No external account needed

#### Format & validation

- **Shape:** lowercase string with hyphens
- **Constraints:** no spaces or special chars
- **Verify:** query in Grafana Explore: `{service_name="tes-agent-service"}`

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | Hardcoded in `deploy.yml:75` |
| Slack | Hardcoded in `deploy.yml:144` |
| Local dev | `.env` files |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [x] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `OTEL_RESOURCE_ATTRIBUTES`

| Field | Value |
|-------|-------|
| Class | config |
| Required | no |
| Consumed by | `agent-service` — cite `agent-service/.env.example:14` |
| Purpose | Optional resource tags for OTLP logs (e.g. deployment environment) |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | none |

#### How to obtain

1. Decide on resource attributes for development environment
2. Use format: `key=value,key2=value2` (e.g. `deployment.environment=dev`)
3. **Copy:** the attributes string
4. **Scope:** development — production would use `deployment.environment=prod`
5. No external account needed

#### Format & validation

- **Shape:** comma-separated `key=value` pairs
- **Constraints:** no spaces around `=` or `,`
- **Verify:** check in Grafana Explore that attributes appear in log labels

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | Not synced via CI/CD (local dev only) |
| Local dev | `agent-service/.env` |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [x] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `AGENT_SERVICE_URL`

| Field | Value |
|-------|-------|
| Class | config |
| Required | yes |
| Consumed by | `slack-app` — cite `slack-app/.env.example:3`, `README.md:46` |
| Purpose | Public HTTPS URL of deployed agent-service — slack-app sends HTTP requests here |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | Render agent-service |

#### How to obtain

1. Open Render dashboard → `https://dashboard.render.com/`
2. Navigate to your `tes-agent-service` web service
3. **Copy:** the service URL (format: `https://tes-agent-service.onrender.com`)
4. **Scope:** development environment URL — differs from production
5. For local dev, use `http://localhost:3000`

#### Format & validation

- **Shape:** `https://<service-name>.onrender.com`
- **Constraints:** valid HTTPS URL, no trailing slash
- **Verify:**
```bash
curl -fsS "${AGENT_SERVICE_URL%/}/health"
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | N/A — this IS the Render service URL |
| Slack | GitHub Variable → `deploy.yml` → `slack env set` |
| Local dev | `slack-app/.env` |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [x] Validated
- Via: placeholder (local-dev only; CI/CD uses SLACK_SERVICE_TOKEN)
- Blocker: none (accepted by user)
- Round: 1

---

### `SLACK_BOT_TOKEN`

| Field | Value |
|-------|-------|
| Class | secret |
| Required | yes |
| Consumed by | `slack-app` — cite `slack-app/.env.example:12` |
| Purpose | Slack bot authentication token — required for all Slack API calls |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | Slack app |

#### How to obtain

1. Open Slack API dashboard → `https://api.slack.com/apps`
2. Select your development app → **OAuth & Permissions**
3. **Copy:** the **Bot User OAuth Token** (format: `xoxb-…`)
4. **Scope:** development Slack workspace — different from production token
5. If app doesn't exist, create a new Slack app with required scopes

#### Format & validation

- **Shape:** `xoxb-<numbers>-<numbers>-<alphanumeric>`
- **Constraints:** starts with `xoxb-`
- **Verify:**
```bash
curl -s -H "Authorization: Bearer $SLACK_BOT_TOKEN" https://slack.com/api/auth.test | jq '.ok'
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | N/A — Slack-managed infra |
| Slack | Set via `slack env add` or app manifest |
| Local dev | `slack-app/.env` |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [x] Validated
- Via: placeholder (local-dev only; CI/CD uses SLACK_SERVICE_TOKEN)
- Blocker: none (accepted by user)
- Round: 1

---

### `SLACK_APP_TOKEN`

| Field | Value |
|-------|-------|
| Class | secret |
| Required | yes |
| Consumed by | `slack-app` — cite `slack-app/.env.example:13` |
| Purpose | Slack app-level token for Socket Mode and app events |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | Slack app |

#### How to obtain

1. Open Slack API dashboard → `https://api.slack.com/apps`
2. Select your development app → **Basic Information** → **App-Level Tokens**
3. **Copy:** the app-level token (format: `xapp-…`)
4. **Scope:** development Slack workspace — requires Socket Mode enabled
5. If missing, create a new App-Level Token with `connections:write` scope

#### Format & validation

- **Shape:** `xapp-<alphanumeric>`
- **Constraints:** starts with `xapp-`
- **Verify:** used by Deno Slack SDK at app startup

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | N/A — Slack-managed infra |
| Slack | Set via `slack env add` or app manifest |
| Local dev | `slack-app/.env` |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [x] Validated
- Via: placeholder (local-dev only; CI/CD uses SLACK_SERVICE_TOKEN)
- Blocker: none (accepted by user)
- Round: 1

---

### `SLACK_SERVICE_TOKEN`

| Field | Value |
|-------|-------|
| Class | secret |
| Required | yes |
| Consumed by | GitHub Actions `deploy.yml:139`, `deploy.yml:42` |
| Purpose | Slack CLI service token for CI/CD `slack deploy` command |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | Slack app |

#### How to obtain

1. Open Slack API dashboard → `https://api.slack.com/apps`
2. Select your development app → **Features** → **CLI**
3. **Copy:** the **Service Token** (format: `xoxp-…`)
4. **Scope:** development workspace — store as GitHub Secret `SLACK_SERVICE_TOKEN`
5. If CLI not enabled, enable it in app settings and generate a service token

#### Format & validation

- **Shape:** `xoxp-<numbers>-<numbers>-<numbers>-<alphanumeric>`
- **Constraints:** starts with `xoxp-`
- **Verify:**
```bash
curl -s -H "Authorization: Bearer $SLACK_SERVICE_TOKEN" https://slack.com/api/auth.test | jq '.ok'
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | N/A — CI/CD only |
| GitHub | GitHub Secret → `deploy.yml` → `slack deploy -s --token` |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [x] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `RENDER_API_KEY`

| Field | Value |
|-------|-------|
| Class | secret |
| Required | yes |
| Consumed by | GitHub Actions `deploy.yml:67`, `deploy.yml:14` |
| Purpose | Render API authentication — used to sync env vars and trigger deploys |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | Render account |

#### How to obtain

1. Open Render dashboard → `https://dashboard.render.com/`
2. Navigate to **Account Settings → API Keys** → `https://dashboard.render.com/u/settings#api-keys`
3. Click **Create API Key** → give it a name (e.g. `tes-ci-dev`)
4. **Copy:** the generated key (format: `rnd_…`) — shown only once
5. **Scope:** development — store as GitHub Secret `RENDER_API_KEY`

#### Format & validation

- **Shape:** `rnd_<alphanumeric>`
- **Constraints:** starts with `rnd_`
- **Verify:**
```bash
curl -fsS -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/services | jq '.[0].id'
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | N/A — this IS the Render API key |
| GitHub | GitHub Secret → `deploy.yml` → Render API calls |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [ ] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `RENDER_DEPLOY_HOOK_URL`

| Field | Value |
|-------|-------|
| Class | config |
| Required | yes |
| Consumed by | GitHub Actions `deploy.yml:103` |
| Purpose | Render deploy trigger URL — POST to this URL triggers a new deploy |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | Render agent-service |

#### How to obtain

1. Open Render dashboard → `https://dashboard.render.com/`
2. Navigate to your `tes-agent-service` → **Settings → Deploy Hooks**
3. Click **Add Deploy Hook** → name it (e.g. `ci-deploy`)
4. **Copy:** the full URL (format: `https://api.render.com/deploy/srv-…?key=…`)
5. **Scope:** specific to the `tes-agent-service` Render service

#### Format & validation

- **Shape:** `https://api.render.com/deploy/srv-<id>?key=<key>`
- **Constraints:** valid HTTPS URL with query parameter
- **Verify:**
```bash
curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL"
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | N/A — Render-generated URL |
| GitHub | GitHub Secret → `deploy.yml` → `curl POST` |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [ ] Validated
- Via: manual
- Blocker: none
- Round: 1

---

### `RENDER_SERVICE_ID`

| Field | Value |
|-------|-------|
| Class | config |
| Required | yes |
| Consumed by | GitHub Actions `deploy.yml:68`, `deploy.yml:20` |
| Purpose | Render service identifier — used in API calls to target the correct service |
| Collection method | manual |
| Tool | — |
| Primary chain | manual |
| Scaffold dependency | Render agent-service |

#### How to obtain

1. Open Render dashboard → `https://dashboard.render.com/`
2. Navigate to your `tes-agent-service` web service
3. **Copy:** the service ID from the URL or settings page (format: `srv-<alphanumeric>`)
4. **Scope:** specific to the `tes-agent-service` Render service
5. Also visible in `deploy.yml` as an example value

#### Format & validation

- **Shape:** `srv-<alphanumeric>`
- **Constraints:** starts with `srv-`
- **Verify:**
```bash
curl -fsS -H "Authorization: Bearer $RENDER_API_KEY" "https://api.render.com/v1/services/$RENDER_SERVICE_ID" | jq '.service.name'
```

#### Deploy mapping

| Target | How injected |
|--------|--------------|
| Render | N/A — Render-generated ID |
| GitHub | GitHub Variable → `deploy.yml` → Render API calls |

#### Harvest status

- [x] Documented
- [x] Tool attempted — manual
- [x] Collected in `.env`
- [ ] Validated
- Via: manual
- Blocker: none
- Round: 1
