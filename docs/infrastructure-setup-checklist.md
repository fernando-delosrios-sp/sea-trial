# Infrastructure Setup Checklist

Work top to bottom. Record connection details inline at each step — these values are what deployment needs. Secrets go in GitHub Secrets or local gitignored `.env` files only; never commit them.

**Related:** [README deploy section](../README.md#deploy-via-github-actions) · [tech-stack requirements](./tech-stack-requirements.md) · [openspec/specs/infrastructure/spec.md](../openspec/specs/infrastructure/spec.md) · [smoke test checklist](./smoke-test-checklist.md)

---

## 1. Local tooling

- [ ] Install Deno (latest stable)
- [ ] Install Node.js 20+
- [ ] Install Slack CLI — `curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash`
- [ ] Clone repo; run `npm install` at monorepo root
- [ ] Authenticate Slack CLI: `slack login` (for local `slack run` only; CI uses `SLACK_SERVICE_TOKEN`)

---

## 2. Slack workspace

- [ ] Confirm workspace is on **Pro** (or higher)
- [ ] Confirm **Canvas**, **Lists**, and custom app installs are enabled

**Record:**

| Field | Value |
|-------|-------|
| Workspace URL | |
| Team ID | |
| Admin contact (app approval) | |

---

## 3. Slack app (Deno Slack SDK)

- [ ] App created and linked to workspace via Slack CLI
- [ ] Deploy to Slack infrastructure enabled
- [ ] App installed to Pro workspace

**Record:**

| Field | Value |
|-------|-------|
| App ID | |
| App name | |
| Deployed app ID (post-`slack deploy`) | |

---

## 4. LLM provider (OpenAI-compatible)

- [ ] Obtain API key from company-approved provider
- [ ] Verify: test chat completion against base URL + model

**Record** (non-secret fields only):

| Field | Value |
|-------|-------|
| Provider name | |
| `LLM_BASE_URL` | |
| `LLM_MODEL` | |

---

## 5. Render (agent-service)

- [ ] Create account at [render.com](https://render.com)
- [ ] Create **Web Service** from repo `render.yaml` (or link existing service)
- [ ] Note Render service ID and deploy hook URL for GitHub Secrets

**Record:**

| Field | Value |
|-------|-------|
| Render service name | |
| Service URL | |
| Render service ID | |

---

## 6. GitHub repository configuration (primary deploy path)

Configure these in **Settings → Secrets and variables → Actions** before the first workflow run. See [README](../README.md#deploy-via-github-actions) for the full inventory.

### Secrets

| Secret | Source |
|--------|--------|
| `LLM_API_KEY` | Step 4 |
| `SLACK_SERVICE_TOKEN` | Slack app settings (deploy token) |
| `RENDER_API_KEY` | Render dashboard |
| `RENDER_DEPLOY_HOOK_URL` | Render service deploy hook |
| `OTEL_EXPORTER_OTLP_HEADERS` | Grafana Cloud (when logging enabled) |

### Variables

| Variable | Source |
|----------|--------|
| `AGENT_SERVICE_URL` | Step 5 service URL |
| `LLM_BASE_URL` | Step 4 |
| `LLM_MODEL` | Step 4 |
| `RENDER_SERVICE_ID` | Step 5 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Grafana Cloud (when logging enabled) |
| `OTEL_LOGS_ENABLED` | `true` or `false` |

- [ ] All required secrets and variables configured
- [ ] `AGENT_SERVICE_URL` matches Render service HTTPS URL

---

## 7. Deploy via GitHub Actions

Primary path — replaces manual Render dashboard edits and `slack env set` for deployed environments.

1. Open **Actions → Deploy → Run workflow**
2. Confirm logs show:
   - Config validation passed
   - Render env sync succeeded
   - Agent-service health check passed (`/health`)
   - Slack-app `slack env set` + `slack deploy` succeeded

- [ ] First workflow run completed successfully
- [ ] `curl $AGENT_SERVICE_URL/health` → **200**
- [ ] Slack Function reaches agent-service (check workflow / function logs if fail)

### Rollback

Re-run the workflow after restoring previous secret/variable values in GitHub. CI logs record who triggered each deploy.

---

## 8. Manual deploy fallback

Use only when GitHub Actions is unavailable.

### agent-service (Render)

```bash
# Set env vars in Render dashboard, then trigger deploy hook
curl -X POST "$RENDER_DEPLOY_HOOK_URL"
curl -fsS "$AGENT_SERVICE_URL/health"
```

### slack-app (Slack CLI)

```bash
cd slack-app
slack env set AGENT_SERVICE_URL "https://your-agent.onrender.com"
slack deploy -s --token "$SLACK_SERVICE_TOKEN"
```

---

## 9. Verify end-to-end

- [ ] Run [smoke test checklist](./smoke-test-checklist.md)
- [ ] Agent-service reaches `LLM_BASE_URL` (check Render logs on test request)

**Record:**

| Check | Pass? | Date / notes |
|-------|-------|--------------|
| Health endpoint | [ ] | |
| Slack → agent-service | [ ] | |
| Agent-service → LLM | [ ] | |
| E2E smoke test | [ ] | |

---

## 10. Production backlog (do not block MVP)

- [ ] Slack Enterprise Grid org-wide install plan
- [ ] Grid admin allowlist: LLM host, agent-service URL
- [ ] AWS or Azure target for agent-service migration
- [ ] Data residency review
- [ ] Secrets rotation policy

---

## Deployment connection summary

Fill once all steps above are complete. Copy this block to share with the team — omit secrets.

```
Slack workspace:
Slack team ID:
Slack app ID:
Agent-service URL:
LLM base URL:
LLM model:
Render service ID:
```
