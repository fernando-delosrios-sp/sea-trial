# Sea Trial

TypeScript monorepo for the Sea Trial Slack platform — TES event delivery in Slack.

| Package | Runtime | Purpose |
|---------|---------|---------|
| `slack-app/` | Deno Slack SDK | Slack-managed app (channel provisioning, canvases, lists) |
| `agent-service/` | Node.js 20+ | Requirements Agent HTTP service |
| `packages/shared/` | — | Shared TypeScript types for both runtimes |
| `packages/observability/` | — | Shared log schema, redaction, and OTLP payload helpers |

## Prerequisites

- Node.js 20+
- [Deno](https://deno.land/) (for `slack-app`)
- [Slack CLI](https://api.slack.com/automation/cli/install) (for deploy)

## Setup

```bash
npm install
npm run build
npm test
```

### agent-service

```bash
cp agent-service/.env.example agent-service/.env
# Set LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
npm run dev:agent
```

Health check: `GET http://localhost:3000/health`

### slack-app

```bash
export PATH="$HOME/.deno/bin:$PATH"
cd slack-app
deno task test
# Deploy to dev tenant:
# slack deploy
```

Set `AGENT_SERVICE_URL` in slack-app environment to point at agent-service.

#### Domain reference data

SailPoint suite mappings and deliverable status vocabulary live in versioned JSON under `slack-app/content/domain/`. The loader at `slack-app/lib/content/domain.ts` validates files at load time; tests enforce parity with `packages/shared` types.

#### Declarative Slack UI content

Modals, list schemas, canvas markdown, and pinned index Block Kit live under `slack-app/content/` (JSON, Handlebars MD, and Handlebars JSON). Loaders in `slack-app/lib/content/` compile content at runtime:

| Kind | Path | Loader |
|------|------|--------|
| Modals | `content/modals/*.json` | `modal-compiler.ts` — `contract.block_ids` + dynamic domain overlay |
| Lists | `content/lists/*.json` | `list-compiler.ts` — column keys, `@domain/*` option refs |
| Canvases | `content/canvases/*.hbs.md` | `canvas-renderer.ts` — metadata injected by code |
| Messages | `content/messages/*.hbs.json` | `message-renderer.ts` |

Import from `slack-app/lib/content/loader.ts` for the full public surface. JSON Schema files under `slack-app/schemas/content/` describe content shapes; tests in `slack_content_test.ts` enforce contracts.

#### Channel composition

TES Event Channel structure — which objects are seeded, in what order, and how IDs link to context — is declared in `slack-app/content/channels/tes-event.json`. The kind registry under `slack-app/content/kinds/*.v1.json` defines extensible object types with `api_availability` gating. Loaders:

| Module | Purpose |
|--------|---------|
| `composition-resolver.ts` | Load manifest, validate, topological sort on `depends_on`, slot map |
| `kind-registry.ts` | Load kind definitions; skip non-stable kinds |
| `channel-provisioner.ts` | Orchestrate channel create; `seed_channel_objects` is a thin executor |

Slot identifiers in the manifest bridge to flat `TesEventContext` fields via `runtime.context_slot_map`. Pinned index links are auto-generated from `navigation.entries`. Tests in `composition_test.ts` enforce schema, order, and slot bridging.

#### Triggers (automatic on deploy)

The GitHub Actions deploy workflow provisions Slack triggers after `slack deploy` using `slack-app/triggers.config.yaml`. No manual `slack trigger create` is required for standard deploys.

| Trigger | Default scope | Purpose |
|---------|---------------|---------|
| **Create TES Event** | global (enabled) | Creation modal → provision workflow |
| **Complete Onboarding** | global (disabled) | Optional link trigger — pinned index block action is primary |
| **TES Onboard** | channel (disabled) | Optional legacy channel shortcut |

Configure scope and channel lists in `slack-app/triggers.config.yaml`:

- `scope: global` — workspace-wide shortcut
- `scope: channel` — one trigger per channel ID in `channels`, or set GitHub Variable `SLACK_TRIGGER_CHANNEL_IDS` (comma-separated) at deploy time

Re-deploy is idempotent: existing triggers are updated, missing ones are created.

Local manual provision (optional):

```bash
cd slack-app
SLACK_SERVICE_TOKEN=... ./scripts/provision-triggers.sh
```

## Deploy via GitHub Actions

Configuration is stored in GitHub Secrets and Variables. A manual workflow deploys both services with those settings.

### GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `LLM_API_KEY` | OpenAI-compatible API key for agent-service |
| `SLACK_SERVICE_TOKEN` | Slack CLI service token for `slack deploy` |
| `RENDER_API_KEY` | Render API key to sync agent-service env vars |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook URL for agent-service |
| `OTEL_EXPORTER_OTLP_HEADERS` | Grafana Cloud OTLP authorization header (required when logging enabled) |

### GitHub Variables

| Variable | Purpose |
|----------|---------|
| `AGENT_SERVICE_URL` | Public HTTPS URL of agent-service (e.g. `https://sea-trial-agent-service.onrender.com`) |
| `LLM_BASE_URL` | OpenAI-compatible API base URL |
| `LLM_MODEL` | Model name (e.g. `gpt-4o`) |
| `RENDER_SERVICE_ID` | Render web service ID for agent-service |
| `SLACK_TEAM_ID` | Slack workspace ID (T…) for pinned index navigation links and delivery canvas URLs |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Grafana Cloud OTLP base URL (e.g. `https://otlp-gateway-prod-eu-west-6.grafana.net/otlp`) |
| `OTEL_LOGS_ENABLED` | Set to `true` to push structured logs from both services (`false` by default) |
| `SLACK_TRIGGER_CHANNEL_IDS` | Optional comma-separated Slack channel IDs for channel-scoped triggers (see `slack-app/triggers.config.yaml`) |

### Trigger a deploy

1. Configure the secrets and variables above in the GitHub repository settings.
2. Open **Actions → Deploy → Run workflow**.
3. Confirm the workflow logs show Render env sync, agent-service health check, slack-app deploy, and Slack trigger provisioning.

### Rollback

Re-run the workflow after restoring previous secret/variable values in GitHub. CI logs record who triggered each deploy.

Local development still uses gitignored `.env` files — see [agent-service/.env.example](agent-service/.env.example) and [slack-app/.env.example](slack-app/.env.example).

### Observability (Grafana Cloud OTLP)

When `OTEL_LOGS_ENABLED=true`, both services push structured logs to Grafana Cloud via OTLP HTTP. slack-app generates a `correlationId` per invocation and sends it to agent-service as `X-Correlation-Id` so logs can be joined in Explore.

Example Grafana Explore queries:

```
{service_name="sea-trial-slack-app"} | correlationId="<id-from-log>"
{service_name="sea-trial-agent-service"} | correlationId="<id-from-log>"
```

Logs include metadata only (file counts, parse outcomes, durations) — never document content, canvas markdown, or LLM prompts. Rotate Grafana credentials via GitHub Secrets; never commit tokens.

## Architecture

- **slack-app** — Slack adapter only (triggers, modals, canvas/list CRUD, file download, HTTP to agent-service)
- **agent-service** — Document parsing, Requirements Agent, TES rules (no Slack API access)
- **packages/shared** — `TesEventContext`, `DeliverableProposal`, `FilePayload`, `ParsedDocument`, HTTP contract types
- **packages/observability** — Log event schema, redaction helpers, OTLP JSON payload builder

### Document parsing (MVP)

Supported formats (parsed in agent-service only):

| Format | Library | Notes |
|--------|---------|-------|
| Plain text / Markdown | pass-through | `.txt`, `.md` |
| DOCX | mammoth | Office Open XML |
| XLSX | sheetjs/xlsx | Cell values as plain text |
| PDF (text-based) | pdf-parse v2 | Image-only/scanned PDFs rejected gracefully |

Unsupported formats return `{ supported: false, error: "..." }` without throwing.

**Transport:** slack-app downloads raw Slack file bytes and sends `FilePayload[]` (`filename`, `mimeType`, `contentBase64`) to agent-service. slack-app does not parse documents.

**Graph:** LangGraph nodes run in order: `loadContext` → `parseDocuments` (no LLM) → `analyzeRequirements` → `clarifyOrPropose` → `formatOutput`. Parsed status is recorded in the Requirements Canvas **Documents processed** section.

**Memory (MVP):** Slack-native only — Requirements Canvas markdown, Deliverables List, and request payload. No external vector store (qdrant, supermemory, gbrain).

**Phase 2 (deferred):** markitdown/marker Python sidecar for complex PDFs; external memory layer when canvas-based recall is insufficient.

All application state lives in Slack canvases and lists.

## Dev tenant install

1. Configure GitHub Secrets/Variables (see [Deploy via GitHub Actions](#deploy-via-github-actions))
2. Run the **Deploy** GitHub Actions workflow (or deploy manually — see [infrastructure checklist](docs/infrastructure-setup-checklist.md))
3. Install app to dev workspace if not already installed
4. Run [smoke test checklist](docs/smoke-test-checklist.md)

## Related docs

- [agent-service API](agent-service/README.md)
- [Infrastructure setup checklist](docs/infrastructure-setup-checklist.md)
- [Tech stack requirements](docs/tech-stack-requirements.md)
- [Smoke test checklist](docs/smoke-test-checklist.md)







