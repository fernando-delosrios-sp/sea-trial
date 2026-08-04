# GitHub Actions Deploy Config — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Deploy both `slack-app` and `agent-service` from GitHub Actions using Secrets/Variables for workspace-wide config (agent URL, LLM model, API key).

**Architecture:** GitHub Secrets/Variables are the source of truth. A `deploy.yml` workflow syncs `LLM_*` to Render, deploys agent-service, health-checks it, then runs `slack env set` + `slack deploy` for slack-app. `invoke_agent` reads `env["AGENT_SERVICE_URL"]`.

**Tech Stack:** GitHub Actions, Render deploy hook/API, Slack CLI, Deno Slack SDK, Node.js agent-service

**Canonical test commands:**
- Monorepo: `npm test` (from repo root)
- Slack-app: `cd slack-app && deno task test`

---

## Task 1: Wire AGENT_SERVICE_URL in invoke_agent

**Files:** `slack-app/functions/invoke_agent/mod.ts`, `slack-app/tests/` (new or extend)

- [ ] **Step 1:** Write failing test — invoke_agent handler throws/reports when `env["AGENT_SERVICE_URL"]` is undefined
  ```bash
  cd slack-app && deno task test
  ```
- [ ] **Step 2:** Run test — expect FAIL
- [ ] **Step 3:** Update `InvokeAgentFunction` — remove `agent_service_url` from `input_parameters` and `required`
- [ ] **Step 4:** Update handler signature to destructure `{ env }`; read `const url = env["AGENT_SERVICE_URL"]`; validate non-empty before `callRequirementsAgent`
- [ ] **Step 5:** Run test — expect PASS
- [ ] **Step 6:** Commit: `feat(slack-app): read AGENT_SERVICE_URL from deploy env`

---

## Task 2: Manifest outgoingDomains from AGENT_SERVICE_URL

**Files:** `slack-app/manifest.ts`, `slack-app/deno.jsonc` (add `std/dotenv/load.ts` import if needed)

- [ ] **Step 1:** Add `import "std/dotenv/load.ts"` to `manifest.ts`
- [ ] **Step 2:** Parse host from `Deno.env.get("AGENT_SERVICE_URL")` — fallback `localhost` for local dev
- [ ] **Step 3:** Set `outgoingDomains: [host, "localhost"]` (dedupe)
- [ ] **Step 4:** Verify local: `cd slack-app && deno cache manifest.ts` succeeds with `.env` present
- [ ] **Step 5:** Commit: `feat(slack-app): derive outgoingDomains from AGENT_SERVICE_URL`

---

## Task 3: GitHub Actions deploy workflow

**Files:** `.github/workflows/deploy.yml`, optional `render.yaml`

- [ ] **Step 1:** Create `.github/workflows/deploy.yml` with:
  - `on: workflow_dispatch`
  - Job `deploy-agent-service`: checkout, sync Render env (API or documented hook), trigger deploy, `curl --fail $AGENT_SERVICE_URL/health`
  - Job `deploy-slack-app`: `needs: deploy-agent-service`, install Deno + Slack CLI, `slack env set AGENT_SERVICE_URL "${{ vars.AGENT_SERVICE_URL }}"`, `slack deploy -s --token ${{ secrets.SLACK_SERVICE_TOKEN }}`
- [ ] **Step 2:** Add env guard step — fail if `vars.AGENT_SERVICE_URL`, `secrets.LLM_API_KEY`, `secrets.SLACK_SERVICE_TOKEN` unset
- [ ] **Step 3:** Validate YAML syntax locally if actionlint available; otherwise manual review
- [ ] **Step 4:** Commit: `ci: add GitHub Actions deploy workflow`

---

## Task 4: Render blueprint (optional)

**Files:** `render.yaml` at repo root or `agent-service/render.yaml`

- [ ] **Step 1:** Add Render web service definition pointing at `agent-service/`, build/start commands, env var keys (no values)
- [ ] **Step 2:** Document in README that Render service must exist before first workflow run
- [ ] **Step 3:** Commit: `chore: add render.yaml blueprint`

---

## Task 5: Documentation

**Files:** `README.md`, `docs/infrastructure-setup-checklist.md`, `slack-app/.env.example`

- [ ] **Step 1:** Add GitHub Secrets/Variables table to README
- [ ] **Step 2:** Update infrastructure checklist section 6 — GitHub as primary path; manual steps as fallback
- [ ] **Step 3:** Add "Deploy via GitHub Actions" section with `workflow_dispatch` instructions and rollback (re-run with prior values)
- [ ] **Step 4:** Commit: `docs: GitHub Actions deploy configuration`

---

## Task 6: Verification

- [ ] **Step 1:** Run `npm test` from repo root — all pass
- [ ] **Step 2:** Run `cd slack-app && deno task test` — all pass
- [ ] **Step 3:** Dry-run review of workflow — no secret echo, job ordering correct
- [ ] **Step 4:** Mark tasks.md checkboxes complete

**Note:** Full E2E workflow run requires GitHub Secrets configured in the repo — document as post-merge ops step.
