# Infrastructure Setup Checklist

Work top to bottom. Record connection details inline at each step — these values are what deployment needs. Secrets (`LLM_API_KEY`, tokens) go in Render env or local `.env` only; never commit them.

**Related:** [tech-stack-requirements.md](./tech-stack-requirements.md) · [openspec/specs/infrastructure/spec.md](../openspec/specs/infrastructure/spec.md)

---

## 1. Local tooling

- [x] Install Deno (latest stable) — v2.9.4
- [x] Install Node.js 20+ — v24.18.0
- [x] Install Slack CLI v4.6.0 — `npm install -g @slack/cli` is stale (the npm package no longer exists); correct install is the official Go-binary script: `curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash`
- [x] Install openspec CLI (if not already) — v1.6.0 via `npm install -g @fission-ai/openspec@latest`
- [ ] Clone repo; run `npm install` at monorepo root once scaffold exists
- [x] Authenticate Slack CLI: `slack login` — verified via `slack doctor` (workspace `fdelosrios`, team `TEX1209CG`, user `UEYQ9MH7Z`, token valid)

---

## 2. Slack workspace

- [x] Confirm workspace is on **Pro** (or higher)
- [x] Confirm **Canvas**, **Lists**, and custom app installs are enabled

**Record:**

| Field | Value |
|-------|-------|
| Workspace URL | `https://fdelosrios.slack.com` |
| Team ID | `TEX1209CG` |
| Admin contact (app approval) | fdelosriossanchez@gmail.com |
| User ID (CLI auth) | `UEYQ9MH7Z` |

---

## 3. Slack app (Deno Slack SDK)

Do **not** use the "AI Agent" template at api.slack.com — that is Bolt + Agent Kit, wrong stack. Create via CLI when Task 1 scaffolds `slack-app/`:

```bash
cd slack-app
slack create . --template slack-samples/deno-blank-template
```

Scopes to include in `manifest.ts`:

- `channels:manage`
- `canvases:read` / `canvases:write`
- `lists:read` / `lists:write`
- `files:read`
- `users:read`
- `chat:write`

- [ ] App created and linked to workspace via Slack CLI
- [ ] Deploy to Slack infrastructure enabled
- [ ] App installed to Pro workspace
- [ ] API spike passes: `canvases.create` + `slacklists.create` return **200**

**Record:**

| Field | Value |
|-------|-------|
| App ID | `A________________` |
| App name | |
| Deployed app ID (post-`slack deploy`) | |

---

## 4. LLM provider (OpenAI-compatible)

- [x] Obtain API key from company-approved provider
- [x] Verify: test chat completion against base URL + model — HTTP 200, `deepseek-v4-pro` replied `"OK"` for a 16-token prompt
**Record** (non-secret fields only):
| Field | Value |
|-------|-------|
| Provider name | opencode.ai (Zen gateway) |
| `LLM_BASE_URL` | `https://opencode.ai/zen/go/v1` |
| `LLM_MODEL` | `deepseek-v4-pro` |

**Secret** — set in Render + local `agent-service/.env` only:

| Field | Set in Render? | Set locally? |
|-------|----------------|--------------|
| `LLM_API_KEY` | [ ] | [ ] |

---

## 5. Render (agent-service)

- [ ] Create account at [render.com](https://render.com)
- [ ] Create **Web Service** pointing at `agent-service/` (after scaffold exists)
- [ ] Set env vars from steps 4 and 6
- [ ] First deploy succeeds; `/health` returns **200**

**Record:**

| Field | Value |
|-------|-------|
| Render service name | |
| Service URL | `https://fdelosrios.onrender.com` |
| Render service ID | |

---

## 6. Wire environment variables

Set these on **Render** and in local **`agent-service/.env`** (gitignored). Create `agent-service/.env.example` with keys only when scaffold exists.

| Variable | Value source | Render | Local `.env` |
|----------|--------------|--------|--------------|
| `LLM_API_KEY` | Step 4 secret | [ ] | [ ] |
| `LLM_BASE_URL` | Step 4 | [ ] | [ ] |
| `LLM_MODEL` | Step 4 | [ ] | [ ] |
| `PORT` | Render sets automatically | — | [ ] |

Set in **slack-app** manifest / function config (after scaffold):

| Variable | Value source | Set? |
|----------|--------------|------|
| Agent-service URL | Step 5 service URL | [ ] |

---

## 7. Deploy and verify

Run after both `slack-app` and `agent-service` are scaffolded and deployed.

- [ ] `curl https://<service-url>/health` → **200**
- [ ] Slack Function reaches agent-service URL (check deploy logs if fail)
- [ ] Agent-service reaches `LLM_BASE_URL` (check Render logs on test request)
- [ ] End-to-end smoke test: provision channel → onboard → @mention agent → accept proposal

**Record:**

| Check | Pass? | Date / notes |
|-------|-------|--------------|
| Health endpoint | [ ] | |
| Slack → agent-service | [ ] | |
| Agent-service → LLM | [ ] | |
| E2E smoke test | [ ] | |

---

## 8. Production backlog (do not block MVP)

- [ ] Slack Enterprise Grid org-wide install plan
- [ ] Grid admin allowlist: LLM host, agent-service URL
- [ ] AWS or Azure target for agent-service migration
- [ ] Data residency review
- [ ] Secrets rotation policy

---

## Deployment connection summary

Fill once all steps above are complete. Copy this block to share with the team or paste into deployment config — omit secrets.

```
Slack workspace:     https://fdelosrios.slack.com
Slack team ID:       TEX1209CG
Slack app ID:
Agent-service URL:   https://fdelosrios.onrender.com
LLM base URL:        https://opencode.ai/zen/go/v1
LLM model:           deepseek-v4-pro
Render service:
```
