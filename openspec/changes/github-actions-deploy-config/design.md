## Context

The TES Event Process monorepo deploys two components:

| Component | Host | Config today |
|-----------|------|--------------|
| `agent-service` | Render (MVP) | `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` via Render env |
| `slack-app` | Slack ROSI | `AGENT_SERVICE_URL` documented but not wired; `SLACK_SERVICE_TOKEN` for deploy |

Exploration confirmed workspace-wide settings (agent URL, model, key), GitHub as secret store, redeploy-on-change acceptable, and CI/CD logs sufficient for audit.

## Goals / Non-Goals

**Goals:**

- Store deploy-time secrets in GitHub Secrets; non-secrets in GitHub Variables
- GitHub Actions workflow deploys agent-service and slack-app with injected config
- Wire `AGENT_SERVICE_URL` into slack-app via function `env` context
- Document required GitHub Secrets/Variables and workflow trigger
- CI run log serves as config-change audit trail

**Non-Goals:**

- Runtime reconfiguration without redeploy
- In-Slack admin UI or Slack Datastore config
- Per-event or per-channel config overrides
- Passing LLM credentials through slack-app or HTTP request body
- AWS/Azure migration (future; workflow structure should remain portable)

## Decisions

### D1: GitHub as single config source

- **Choice:** GitHub Secrets + Variables; workflow reads them at deploy time
- **Reason:** User requirement; familiar ops model; built-in audit via Actions logs
- **Alternatives considered:** Manual Render + `slack env set` (rejected — fragmented); Slack Datastore admin UI (rejected — over-engineered)

### D2: Split secrets by service boundary

- **Choice:**
  - **agent-service (Render):** `LLM_API_KEY` (secret), `LLM_BASE_URL` + `LLM_MODEL` (vars)
  - **slack-app (Slack ROSI):** `AGENT_SERVICE_URL` (var), `SLACK_SERVICE_TOKEN` (secret for deploy)
- **Reason:** Preserves D3a boundary — LLM credentials never enter slack-app
- **Alternatives considered:** All config in slack-app env passed to agent-service (rejected — security + boundary violation)

### D3: Combined deploy workflow with ordered jobs

- **Choice:** Single workflow (e.g. `deploy.yml`) with jobs: `deploy-agent-service` → `deploy-slack-app` (slack-app depends on agent-service URL being live)
- **Reason:** Agent URL must resolve before slack-app deploy; single workflow_dispatch or push-to-main trigger
- **Alternatives considered:** Separate workflows (acceptable but harder to guarantee order); configure-only job without deploy (rejected — user accepts redeploy)

### D4: Agent-service deploy via Render deploy hook

- **Choice:** Render deploy hook URL (GitHub Secret) triggers redeploy; Render env vars set via Render dashboard initially OR Render API in workflow
- **Reason:** Simplest MVP integration; Render free tier supports deploy hooks
- **Alternatives considered:** Full Render API env sync in workflow (more complex; defer unless hook-only insufficient)

**Note:** Render env vars for `LLM_*` must be present on the Render service. Workflow options:
1. **Phase 1 (MVP):** Document one-time Render env setup; hook only triggers redeploy after GitHub secret rotation (ops updates Render manually once, then hook for code deploys)
2. **Phase 2 (preferred in this change):** Workflow uses Render API to sync env vars from GitHub Secrets before triggering deploy hook

Design assumes **Phase 2** — full sync from GitHub — since user wants secrets to live in GitHub only.

### D5: Slack-app deploy via `slack deploy` + `slack env set`

- **Choice:** CI job runs `slack env set AGENT_SERVICE_URL ${{ vars.AGENT_SERVICE_URL }}` then `slack deploy` with `SLACK_SERVICE_TOKEN`
- **Reason:** Standard Deno Slack SDK ROSI pattern; env available to functions via `env` context
- **Alternatives considered:** Bake URL into manifest via `Deno.env.get` at deploy (works for outgoingDomains but not function runtime — use function `env` for invoke_agent)

### D6: Wire invoke_agent to env, remove input param

- **Choice:** `invoke_agent` reads `env["AGENT_SERVICE_URL"]`; remove `agent_service_url` from input_parameters
- **Reason:** Eliminates unwired input param; single source at deploy time
- **Alternatives considered:** Keep input param with env fallback (rejected — unnecessary complexity)

## Risks / Trade-offs

- [Risk] Render API env sync adds workflow complexity → Mitigation: start with documented Render API call; fall back to deploy hook + one-time manual env if API blocked
- [Risk] `outgoingDomains` in manifest must include agent-service host → Mitigation: derive from `AGENT_SERVICE_URL` at deploy via `Deno.env.get` in manifest.ts OR document stable Render subdomain
- [Risk] Slack deploy requires admin-approved apps on some workspaces → Mitigation: document in checklist; workflow fails clearly
- [Risk] Secret exposure in logs → Mitigation: never echo secrets; use GitHub masked secrets; review workflow for leak patterns
- [Trade-off] Redeploy on every config change (~minutes latency) → Accepted per user

## Migration Plan

1. Add GitHub Secrets/Variables to repository (document inventory)
2. Add `.github/workflows/deploy.yml`
3. Wire `invoke_agent` to `env["AGENT_SERVICE_URL"]`
4. Optional: update `manifest.ts` to derive `outgoingDomains` from `AGENT_SERVICE_URL`
5. Run workflow manually (`workflow_dispatch`) to first deploy
6. Update infrastructure checklist — GitHub replaces manual Render/Slack CLI steps
7. Rollback: re-run workflow with previous secret/var values; or revert commit and redeploy

## Open Questions

- Render service ID / API key availability — ops must provision before first workflow run
- Whether to trigger on `push` to `main` only, or `workflow_dispatch` only initially (recommend `workflow_dispatch` first, add push trigger after validation)
