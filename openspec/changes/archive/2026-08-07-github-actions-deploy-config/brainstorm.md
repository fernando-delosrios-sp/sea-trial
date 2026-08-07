<!--
Raw capture of superpowers:brainstorming output.
Exploration session 2026-08-04 — admin reconfiguration of Slack app settings.
-->

## Background

The TES Event Process monorepo has two deployable components with separate config surfaces today:

- **slack-app** (Deno Slack SDK, ROSI): documents `AGENT_SERVICE_URL` in `.env.example` but does not read it; `invoke_agent` expects `agent_service_url` as a function input.
- **agent-service** (Node.js on Render): reads `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` from `process.env` — already works.

Manual setup is documented in `docs/infrastructure-setup-checklist.md` (Render dashboard + `slack env set`). No `.github/` workflows exist yet.

Initial exploration goal: allow workspace admin to reconfigure app behaviour **without redeployment**.

## Decision chain

### Q1: Which settings must be configurable?

**Answer:** Agent URL, LLM model, and LLM API key to start with. (`LLM_BASE_URL` implied — required for non-OpenAI vendors already in use.)

Workspace-wide scope — not per-event channel.

### Q2: Who is the admin, and how do they change settings?

**Initial answer:** CLI access is acceptable for ops (`slack env set` + Render env dashboard).

**Revised answer (final):** Redeployment is fine. Secrets SHALL live in **GitHub Secrets/Variables**; a **GitHub Actions** workflow deploys both services with those settings. CI/CD run logs are sufficient for audit — no in-app audit trail needed.

### Q3: Runtime config without redeploy vs deploy-time config?

**Initial exploration:** Three layers considered:
1. `slack env set` for function runtime env (no Slack redeploy for value changes)
2. Slack Datastore / admin canvas for in-Slack UI
3. Split: slack-app env for URL, agent-service env for LLM

**Final decision:** Abandon runtime-only reconfiguration. Accept full redeploy on config change. Centralise secrets in GitHub; CI/CD is the single admin interface.

### Q4: Where do MODEL and KEY live?

**Decision:** Keep LLM credentials on **agent-service only** (existing D3a boundary). Do NOT pass API keys through slack-app or per-request HTTP headers.

Slack-app receives only `AGENT_SERVICE_URL` (non-secret, can be a GitHub Variable).

### Q5: What still requires code/manifest redeploy?

**Acknowledged:** `outgoingDomains` in `manifest.ts` must include the agent-service host. Mitigation: use a stable Render URL or custom domain; document that host changes may need manifest update + redeploy.

## Approaches considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| A. `slack env set` only (no redeploy) | Fast value changes | Two surfaces (Slack CLI + Render); no GitHub audit | Rejected — user prefers GitHub |
| B. Slack Datastore admin UI | In-Slack self-service | Over-engineered for MVP; audit weak | Rejected |
| C. GitHub Secrets + Actions deploy | Single source of truth; CI audit trail; familiar ops model | Redeploy on every config change | **Selected** |

## Design trade-offs

- **Redeploy latency:** Config changes trigger full deploy (~minutes). Acceptable per user.
- **Secret rotation:** Update GitHub Secret → re-run workflow. No manual Render/Slack CLI steps.
- **Outgoing domain stability:** Agent URL changes to new host require manifest `outgoingDomains` update — document in runbook.
- **Render coupling:** MVP stays on Render deploy hook/API from GitHub Actions; portable to AWS/Azure later per existing infrastructure spec.

## Open items resolved

- Audit: GitHub Actions logs (who triggered, when, masked secrets)
- Scope: workspace-wide config only
- In-Slack admin UI: out of scope for this change
