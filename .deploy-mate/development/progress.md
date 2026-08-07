# deploy-mate progress — development

Started: 2026-08-05 (re-run)
Status: verify passed (automated) — manual Slack smoke pending; 2026-08-07

## Phase checklist
- [x] Recon — environment selected (development, re-run)
- [x] Survey — sign-off: approved 2026-08-05
- [x] Catalog — var name inventory (15 vars)
- [x] Arm — tooling map (deploy + collection)
- [x] Arm-ready — 7/7 tooling rows terminal; audit ack 2026-08-05
- [x] Scaffold — pre-existing resources confirmed (Render service, Slack app)
- [x] Document — obtain playbooks (hard gate)
- [x] Harvest — finished 2026-08-07 (round 2 re-validation after Sea Trial migration; local-dev token placeholders accepted)
- [x] Forge — deployment artifacts
- [x] Inject CI — GitHub Secrets/Variables — done 2026-08-05
- [x] Deploy — local 2026-08-07: Sea Trial slack deploy ✓, trigger provision ✓ (`Create TES Event` Ft0BNUSJTDEG)
- [x] Verify — automated checks passed 2026-08-07; manual smoke checklist pending

## Arm-ready audit (2026-08-05)
| Source / target | Tool | Status |
|-----------------|------|--------|
| Render (deploy) | Render MCP | opt-out |
| Slack (deploy) | slack CLI | ready |
| GitHub Actions (deploy) | gh CLI | ready |
| Render (collection) | REST API / manual | manual-only |
| Slack (collection) | slack CLI | ready |
| OpenAI-compatible LLM | — | manual-only |
| Grafana Cloud | — | manual-only |

User ack: yes — 2026-08-05

## Inject CI (2026-08-05)

| Var | Target | Action |
|-----|--------|--------|
| `LLM_API_KEY` | repo secret | synced |
| `RENDER_API_KEY` | repo secret | synced |
| `RENDER_DEPLOY_HOOK_URL` | repo secret | synced |
| `SLACK_SERVICE_TOKEN` | repo secret | synced |
| `AGENT_SERVICE_URL` | repo variable | synced |
| `LLM_BASE_URL` | repo variable | synced |
| `LLM_MODEL` | repo variable | synced |
| `RENDER_SERVICE_ID` | repo variable | synced |
| `OTEL_LOGS_ENABLED` | repo variable | created |

Verify: `gh secret list` → 4 secrets; `gh variable list` → 5 variables.

## Deploy (2026-08-07)

| Run | URL | Outcome |
|-----|-----|---------|
| 31169954231 | [Actions](https://github.com/fernando-delosrios-sp/tes-event-process/actions/runs/31169954231) | **partial** — agent-service ✓, slack-app ✗ (invalid_interactivity_pointer) |
| local | `slack deploy -s` + `provision-triggers.sh` | **success** — Sea Trial (`A0BNHB84NCT`), trigger `Ft0BNUSJTDEG` updated |

## Verify (2026-08-07)

| Check | Result | Evidence |
|-------|--------|----------|
| agent-service `/health` | ✓ pass | `200` — `{"status":"ok"}` |
| `AGENT_SERVICE_URL` reachable | ✓ pass | `https://tes-agent-service.onrender.com/health` |
| GitHub secrets (4) | ✓ pass | `LLM_API_KEY`, `RENDER_*`, `SLACK_SERVICE_TOKEN` |
| GitHub variables (5) | ✓ pass | `AGENT_SERVICE_URL`, `LLM_*`, `RENDER_SERVICE_ID`, `OTEL_LOGS_ENABLED` |
| `SLACK_SERVICE_TOKEN` auth | ✓ pass | `auth.test` ok, workspace `TEX1209CG` |
| Slack trigger installed | ✓ pass | **Create TES Event** `Ft0BNUSJTDEG` (global) |
| Automated tests | ✓ pass | npm + deno 81/81; deploy workflow contract test |
| OTEL logs (disabled) | — skip | `OTEL_LOGS_ENABLED=false` |
| Manual Slack smoke | ⏳ pending | [smoke-test-checklist.md](docs/smoke-test-checklist.md) — requires in-workspace testing |

**Outcome:** automated verify **passed**; manual smoke checklist not yet executed in Slack.

**CI failure root cause:** `create_tes_event` workflow passed workflow-level interactivity to step 2 (`provision_channel`) instead of step 1 output; Slack rejected manifest on App Create (no `apps.json` on remote).

**Fix applied (local, uncommitted):**
- Removed unused `interactivity` input from `provision_channel` function + workflow step
- Sea Trial manifest, `apps.json`, icon, and `deploy.yml` `slack env set` steps remain local-only — push to fix CI slack deploy

## Deploy (2026-08-05)

| Run | URL | Outcome |
|-----|-----|---------|
| 31015862469 | [Actions](https://github.com/fernando-delosrios-sp/tes-event-process/actions/runs/31015862469) | failed — Render build_failed, health 502 |
| 31017295731 | [Actions](https://github.com/fernando-delosrios-sp/tes-event-process/actions/runs/31017295731) | **success** — agent-service ✓, slack-app ✓ |

Fixes applied (runs 31016396756–31017295731):
- `render.yaml`: build full monorepo (`npm run build`) — commit `4beb494`
- Render API PATCH: updated dashboard buildCommand (repo yaml not auto-synced to existing service)
- CI: build observability package before slack deploy
- slack-app: allowEmptyValues dotenv, workflow step wiring, outgoing domains, .env-only deploy

Results:
- agent-service: Render deploy `live`, health `200` at `/health`
- slack-app: deployed via `slack deploy` (run 31017295731)

## Harvest rounds
| Round | Date | Collected | Validated | Blocked | User action |
|-------|------|-----------|-----------|---------|-------------|
| 1 | 2026-08-05 | 15/15 | 13/15 | 0 | placeholders accepted for local-dev-only tokens |
| 2 | 2026-08-07 | 15/15 | 12/15 | 0 | Sea Trial re-validation; local-dev tokens deferred (ROSI — use `slack run`) |

**Harvest finished:** 2026-08-07 — all deploy-critical Required: yes vars Collected + Validated. Local-dev `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` remain placeholders (ROSI apps use CLI auth for `slack run`; CI uses `SLACK_SERVICE_TOKEN`).

### Harvest round 2 — Sea Trial migration (2026-08-07)

**Trigger:** App rebranded to Sea Trial (`A0BNHB84NCT`); old `tes-event-process` (`A0BNBFYA42G`) deleted; runtime env synced via `slack env set`.

**CLI validation (deploy-critical):**
| Check | Result |
|-------|--------|
| `SLACK_SERVICE_TOKEN` → `auth.test` | ok |
| `AGENT_SERVICE_URL` → `/health` | ok |
| `RENDER_API_KEY` → service describe | ok (`tes-agent-service`, not suspended) |
| GitHub secrets (4) + variables (5) | present |
| Sea Trial runtime env (4 vars) | set (`AGENT_SERVICE_URL`, OTEL_*) |

**Local-dev note:** `SLACK_BOT_TOKEN` fails `auth.test` (invalid_auth — token from deleted app). `SLACK_APP_TOKEN` remains placeholder. Does not block CI/CD deploy.

**`.env`:** unchanged (no overwrites this round).

## Re-run delta (2026-08-07)
| Section | Status |
|---------|--------|
| configuration.md | updated — scaffold registry + Slack CLI notes |
| progress.md | updated — harvest round 2 |
| slack-app runtime env | updated — 4 vars on Sea Trial |
| `.env` | unchanged |

## Re-run delta (2026-08-05)
| Section | Status |
|---------|--------|
| architecture.md | new |
| configuration.md | new |
| deployment.md | new |
| `.env` | unchanged (existing with real values) |
| generated files | new |

## Generated files
| File | Purpose | Created |
|------|---------|---------|
| `architecture.md` | Runtime architecture + diagram | 2026-08-05 |
| `configuration.md` | 15 vars documented + collected | 2026-08-05 |
| `deployment.md` | Deploy strategy + rollback | 2026-08-05 |
| `.env` | Collected env values (chmod 600) | 2026-08-05 |


