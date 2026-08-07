## 1. Trigger configuration

- [x] 1.1 Add `slack-app/triggers.config.yaml` with entries for `create_tes_event` (global, enabled), `complete_onboarding` (global, enabled), `tes_onboard` (channel, disabled by default)
- [x] 1.2 Document config schema inline in YAML comments (scope, channels, enabled, trigger_def)
- [x] 1.3 Add config parser test — `slack-app/tests/triggers_config_test.ts` validates default entries and rejects invalid scope values

## 2. Provision script

- [x] 2.1 Add `slack-app/scripts/provision-triggers.sh` — parse config, resolve channel IDs from inline list or `SLACK_TRIGGER_CHANNEL_IDS` env var
- [x] 2.2 Implement idempotent sync — list triggers JSON, match by name + workflow/function + channel, update or create
- [x] 2.3 Support `scope: global` and `scope: channel` (one trigger per channel ID) using verified Slack CLI flags
- [x] 2.4 Skip entries with `enabled: false`; exit non-zero on CLI failure with trigger id in stderr
- [x] 2.5 Add unit/integration tests for config → channel resolution logic (deno or shell test with mocked list output)

## 3. CI/CD workflow

- [x] 3.1 Ensure `slack-app/.slack/apps.json` is committed for non-interactive `--app` targeting (prerequisite for CI)
- [x] 3.2 Add `Provision Slack triggers` step to `.github/workflows/deploy.yml` after `slack deploy`
- [x] 3.3 Pass `SLACK_SERVICE_TOKEN`, app ID from apps.json, and optional `vars.SLACK_TRIGGER_CHANNEL_IDS` to provision script
- [x] 3.4 Add workflow test or static check asserting deploy job includes trigger provision step (extend existing deploy workflow test if present)

## 4. Spec scenario coverage — infrastructure

- [x] 4.1 Test: triggers provisioned after deploy — workflow YAML contains provision step after slack deploy
- [x] 4.2 Test: provisioning failure fails job — script exits 1 on simulated CLI error
- [x] 4.3 Test: default config lists create_tes_event global enabled
- [x] 4.4 Test: disabled trigger skipped — enabled false entry not passed to CLI
- [x] 4.5 Test: global scope invokes create without channel flag
- [x] 4.6 Test: channel scope creates one instance per channel ID
- [x] 4.7 Test: `SLACK_TRIGGER_CHANNEL_IDS` env override used when inline channels empty
- [x] 4.8 Test: idempotent update — existing trigger ID triggers update path not create

## 5. Spec scenario coverage — event-channel

- [x] 5.1 Test: deploy workflow provisions create_tes_event trigger (no manual step in docs)
- [x] 5.2 Test: channel-scoped config generates per-channel trigger entries

## 6. Documentation

- [x] 6.1 Update `README.md` — triggers section: automatic on deploy, config file reference, optional `SLACK_TRIGGER_CHANNEL_IDS` variable
- [x] 6.2 Update `docs/smoke-test-checklist.md` — remove manual trigger create prerequisite; note CI provisions shortcuts
- [x] 6.3 Update `.deploy-mate/development/deployment.md` — add trigger provision step and GitHub Variable for channel IDs
- [x] 6.4 Add inline comments to `triggers.config.yaml` and `provision-triggers.sh` usage header

## 7. Changelog

- [x] 7.1 Create or update changelog entry for this change
- [x] 7.2 Confirm entry covers user-visible changes from proposal Capabilities (automated triggers, scope config)
