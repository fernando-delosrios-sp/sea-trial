## 1. Slack-app env wiring

- [x] 1.1 Update `invoke_agent` to read `env["AGENT_SERVICE_URL"]` instead of input param
- [x] 1.2 Remove `agent_service_url` from `InvokeAgentFunction` input_parameters
- [x] 1.3 Add clear error when `AGENT_SERVICE_URL` is missing or empty
- [x] 1.4 Update `slack-app/.env.example` with comment that CI sets deployed values

## 2. Manifest outgoing domain

- [x] 2.1 Update `manifest.ts` to derive agent-service host from `AGENT_SERVICE_URL` (via `std/dotenv/load.ts` at build/deploy) for `outgoingDomains`
- [x] 2.2 Verify manifest still includes `localhost` for local dev

## 3. GitHub Actions workflow

- [x] 3.1 Create `.github/workflows/deploy.yml` with `workflow_dispatch` trigger
- [x] 3.2 Add `deploy-agent-service` job: sync `LLM_*` env to Render, trigger deploy, curl `/health`
- [x] 3.3 Add `deploy-slack-app` job (needs agent-service job): install Slack CLI + Deno, `slack env set AGENT_SERVICE_URL`, `slack deploy`
- [x] 3.4 Fail workflow early if required secrets/vars are unset
- [x] 3.5 Add optional `render.yaml` blueprint for agent-service if not present

## 4. Tests

- [x] 4.1 Add/update slack-app test for missing `AGENT_SERVICE_URL` error path
- [x] 4.2 Confirm existing agent-service LLM config tests still pass (`npm test`)

## 5. Documentation

- [x] 5.1 Document GitHub Secrets/Variables inventory in README
- [x] 5.2 Update `docs/infrastructure-setup-checklist.md` — GitHub replaces manual Render/Slack CLI deploy steps
- [x] 5.3 Add workflow usage section (how to trigger, expected logs, rollback)

## 6. Changelog

- [x] 6.1 Create or update changelog entry for GitHub Actions deploy config
- [x] 6.2 Confirm entry covers CI deploy and env wiring changes
