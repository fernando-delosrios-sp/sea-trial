## Why

Configuration for the TES platform is split across manual steps today: Render dashboard for LLM settings, Slack CLI for agent-service URL, and slack-app code that does not yet read `AGENT_SERVICE_URL` at runtime. There is no `.github/` automation, so redeploying with updated secrets requires ad-hoc ops work and leaves no central audit trail.

Ops needs a single, repeatable path to deploy both `slack-app` and `agent-service` with workspace-wide settings (agent URL, LLM model, API key) sourced from GitHub, with CI/CD logs as the audit record.

## What Changes

**Configuration source of truth**
- From: Manual Render env + `slack env set` documented in checklist
- To: GitHub Secrets and Variables as the canonical config store
- Reason: Centralised secret management and auditable deploys
- Impact: Non-breaking; replaces manual setup path

**Deployment automation**
- From: No GitHub Actions workflows
- To: CI workflow(s) that deploy agent-service to Render and slack-app to Slack ROSI, injecting config from GitHub
- Reason: Repeatable deploys; redeploy-on-config-change is acceptable
- Impact: New `.github/workflows/` files; requires GitHub repo secrets configuration

**Slack-app env wiring**
- From: `invoke_agent` requires `agent_service_url` as a function input (unwired)
- To: `invoke_agent` reads `AGENT_SERVICE_URL` from function `env` context, set at deploy time via CI
- Reason: Completes documented but missing env integration
- Impact: Non-breaking once trigger wiring passes env (or function reads env directly)

**Documentation**
- From: Manual infrastructure checklist as primary deploy guide
- To: README + checklist updated with GitHub Secrets inventory and workflow trigger instructions
- Reason: Ops uses GitHub as admin interface
- Impact: Documentation only

## Capabilities

### New Capabilities

<!-- None — extends existing infrastructure capability -->

### Modified Capabilities

- `infrastructure`: Add requirements for GitHub Actions–driven deployment, GitHub Secrets/Variables inventory, and deploy-time injection of `AGENT_SERVICE_URL` (slack-app) and `LLM_*` (agent-service).

## Impact

- **New files:** `.github/workflows/deploy.yml` (or split workflows), optional `render.yaml` for agent-service
- **Modified:** `slack-app/functions/invoke_agent/mod.ts` — read `env["AGENT_SERVICE_URL"]`
- **Modified:** `docs/infrastructure-setup-checklist.md`, `README.md`, `slack-app/.env.example`
- **GitHub repo settings:** Secrets (`LLM_API_KEY`, `SLACK_SERVICE_TOKEN`, `RENDER_DEPLOY_HOOK_URL` or Render API key) and Variables (`AGENT_SERVICE_URL`, `LLM_BASE_URL`, `LLM_MODEL`)
- **External:** Render web service (agent-service host), Slack ROSI deploy target
- **Out of scope:** In-Slack admin UI, Slack Datastore config, per-event overrides, runtime config without redeploy
