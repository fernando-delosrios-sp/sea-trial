# TES Event Process

TypeScript monorepo for the TES Slack event delivery platform.

| Package | Runtime | Purpose |
|---------|---------|---------|
| `slack-app/` | Deno Slack SDK | Slack-managed app (channel provisioning, canvases, lists) |
| `agent-service/` | Node.js 20+ | Requirements Agent HTTP service |
| `packages/shared/` | — | Shared TypeScript types for both runtimes |

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

## Deploy via GitHub Actions

Configuration is stored in GitHub Secrets and Variables. A manual workflow deploys both services with those settings.

### GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `LLM_API_KEY` | OpenAI-compatible API key for agent-service |
| `SLACK_SERVICE_TOKEN` | Slack CLI service token for `slack deploy` |
| `RENDER_API_KEY` | Render API key to sync agent-service env vars |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook URL for agent-service |

### GitHub Variables

| Variable | Purpose |
|----------|---------|
| `AGENT_SERVICE_URL` | Public HTTPS URL of agent-service (e.g. `https://tes-agent.onrender.com`) |
| `LLM_BASE_URL` | OpenAI-compatible API base URL |
| `LLM_MODEL` | Model name (e.g. `gpt-4o`) |
| `RENDER_SERVICE_ID` | Render web service ID for agent-service |

### Trigger a deploy

1. Configure the secrets and variables above in the GitHub repository settings.
2. Open **Actions → Deploy → Run workflow**.
3. Confirm the workflow logs show Render env sync, agent-service health check, and slack-app deploy.

### Rollback

Re-run the workflow after restoring previous secret/variable values in GitHub. CI logs record who triggered each deploy.

Local development still uses gitignored `.env` files — see [agent-service/.env.example](agent-service/.env.example) and [slack-app/.env.example](slack-app/.env.example).

## Architecture

- **slack-app** — Slack adapter only (triggers, modals, canvas/list CRUD, file download, HTTP to agent-service)
- **agent-service** — Document parsing, Requirements Agent, TES rules (no Slack API access)
- **packages/shared** — `TesEventContext`, `DeliverableProposal`, `FilePayload`, `ParsedDocument`, HTTP contract types

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

