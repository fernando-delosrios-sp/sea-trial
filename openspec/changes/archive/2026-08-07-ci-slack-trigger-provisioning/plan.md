# CI Slack Trigger Provisioning — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Automate Slack trigger install/update in the GitHub Actions deploy pipeline with declarative config supporting global or channel-scoped shortcuts.

**Architecture:** `triggers.config.yaml` declares triggers; `provision-triggers.sh` lists existing triggers, updates or creates per entry, reading channel IDs from config or `SLACK_TRIGGER_CHANNEL_IDS`. New workflow step runs after `slack deploy` with `--app`, `--token`, `-s`.

**Tech Stack:** GitHub Actions, Slack CLI v4.x, Deno (tests), shell

**Canonical test commands:**
- Monorepo: `npm test` (from repo root)
- Slack-app: `cd slack-app && deno task test`

---

## Task 1: Trigger configuration file

**Files:** `slack-app/triggers.config.yaml`, `slack-app/tests/triggers_config_test.ts`, `slack-app/lib/triggers-config.ts`

- [ ] **Step 1:** Write failing test — parser loads default config; `create_tes_event` is global + enabled; invalid scope throws
  ```bash
  cd slack-app && deno task test
  ```
- [ ] **Step 2:** Run test — expect FAIL
- [ ] **Step 3:** Add `triggers.config.yaml` with three entries per design D1
- [ ] **Step 4:** Implement `loadTriggersConfig()` in `lib/triggers-config.ts` (parse YAML via std or deno yaml)
- [ ] **Step 5:** Run test — expect PASS

---

## Task 2: Channel ID resolution

**Files:** `slack-app/lib/triggers-config.ts`, `slack-app/tests/triggers_config_test.ts`

- [ ] **Step 1:** Write failing tests for:
  - Inline `channels: [C1, C2]` used when scope is channel
  - Empty inline + `SLACK_TRIGGER_CHANNEL_IDS=C1,C2` env resolves to `[C1, C2]`
  - Global scope ignores channel list
- [ ] **Step 2:** Run tests — expect FAIL
- [ ] **Step 3:** Implement `resolveChannelIds(entry, env)` 
- [ ] **Step 4:** Run tests — expect PASS

---

## Task 3: Provision script — list and match

**Files:** `slack-app/scripts/provision-triggers.sh`, `slack-app/tests/provision_triggers_test.ts` (or shell test fixtures)

- [ ] **Step 1:** Write test with mocked `slack trigger list --json` output — matcher finds trigger by name + workflow
- [ ] **Step 2:** Run test — expect FAIL
- [ ] **Step 3:** Implement list + match functions in script (or extract match logic to deno lib tested separately)
- [ ] **Step 4:** Run test — expect PASS

---

## Task 4: Provision script — create and update

**Files:** `slack-app/scripts/provision-triggers.sh`

- [ ] **Step 1:** Verify Slack CLI flags for channel scope: `slack trigger create --help` (document in script header)
- [ ] **Step 2:** Write test — global entry calls `create` when no match; matched entry calls `update`
- [ ] **Step 3:** Implement main loop: for each enabled entry × channel (or once for global), create or update
- [ ] **Step 4:** Implement `--force`, `--app`, `--token`, `-s` on all CLI invocations
- [ ] **Step 5:** Exit 1 on any failure with trigger id logged
- [ ] **Step 6:** Run tests — expect PASS

---

## Task 5: Commit apps.json prerequisite

**Files:** `slack-app/.slack/apps.json`, `.gitignore` check

- [ ] **Step 1:** Confirm `apps.json` is not gitignored (Sea Trial app ID `A0BNHB84NCT`)
- [ ] **Step 2:** Commit if not already on branch (needed for CI `--app` resolution)

---

## Task 6: GitHub Actions workflow step

**Files:** `.github/workflows/deploy.yml`

- [ ] **Step 1:** Add step after `slack deploy`:
  ```yaml
  - name: Provision Slack triggers
    working-directory: slack-app
    env:
      SLACK_SERVICE_TOKEN: ${{ secrets.SLACK_SERVICE_TOKEN }}
      SLACK_TRIGGER_CHANNEL_IDS: ${{ vars.SLACK_TRIGGER_CHANNEL_IDS }}
    run: ./scripts/provision-triggers.sh
  ```
- [ ] **Step 2:** Add static test or grep-based test that workflow contains `provision-triggers`
- [ ] **Step 3:** Run `npm test` — expect PASS

---

## Task 7: Documentation

**Files:** `README.md`, `docs/smoke-test-checklist.md`, `.deploy-mate/development/deployment.md`

- [ ] **Step 1:** README — replace manual trigger create with config + auto-provision docs
- [ ] **Step 2:** Smoke checklist — mark trigger install as CI-automated
- [ ] **Step 3:** deploy-mate deployment.md — document optional `SLACK_TRIGGER_CHANNEL_IDS` variable

---

## Task 8: Manual validation (post-merge deploy)

- [ ] **Step 1:** Run Deploy workflow on dev workspace
- [ ] **Step 2:** Confirm `slack trigger list --app A0BNHB84NCT` shows Create TES Event
- [ ] **Step 3:** Invoke shortcut in Slack — creation modal opens

---

## Global Constraints

- Non-interactive CI only — no TTY prompts
- `SLACK_SERVICE_TOKEN` already required for deploy
- Default behavior: global "Create TES Event" shortcut (MVP unchanged)
- Trigger removal from config does NOT delete workspace triggers (non-goal)
