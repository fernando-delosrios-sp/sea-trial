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

## Architecture

- **slack-app** — Slack adapter only (triggers, modals, canvas/list CRUD, file download, HTTP to agent-service)
- **agent-service** — Document parsing, Requirements Agent, TES rules (no Slack API access)
- **packages/shared** — `TesEventContext`, `DeliverableProposal`, HTTP contract types

All application state lives in Slack canvases and lists.

## Dev tenant install

1. Create Slack app from `slack-app/manifest.ts` via `slack deploy`
2. Deploy agent-service (Render free tier or local with tunnel)
3. Set `AGENT_SERVICE_URL` in slack-app env
4. Install app to dev workspace
5. Run [smoke test checklist](docs/smoke-test-checklist.md)

## Related docs

- [agent-service API](agent-service/README.md)
- [Infrastructure setup checklist](docs/infrastructure-setup-checklist.md)
- [Tech stack requirements](docs/tech-stack-requirements.md)
- [Smoke test checklist](docs/smoke-test-checklist.md)
