# Design: CI Slack Trigger Provisioning

## Context

The TES slack-app uses Deno Slack SDK workflows triggered by Slack shortcuts. Trigger definitions live in `slack-app/triggers/*.ts` and are installed to the workspace separately from `slack deploy`. Current GitHub Actions workflow deploys the app and runtime env but omits triggers, leaving the workspace unusable until manual CLI steps.

Sea Trial (`A0BNHB84NCT`) demonstrated this gap post-deploy. The Slack CLI supports non-interactive operation with `--app`, `--token`, and `-s` flags when `apps.json` is present.

## Goals / Non-Goals

**Goals:**
- Automate trigger install/update in `deploy-slack-app` job after successful `slack deploy`
- Declarative config per trigger: definition path, scope (`global` | `channel`), channel list
- Idempotent re-deploy (update existing triggers, create missing ones)
- Default config preserves MVP behavior: global "Create TES Event" shortcut

**Non-Goals:**
- In-Slack trigger management UI
- Auto-deleting triggers removed from config
- Org-wide multi-workspace trigger grants (unless CLI flag already supported)
- Replacing block-action handler for pinned "Complete onboarding" button (that path stays in-app)

## Decisions

### D1: Config file in repo (`triggers.config.yaml`)

**Choice:** YAML schema in `slack-app/triggers.config.yaml` listing trigger entries.

**Rationale:** Version-controlled, reviewable in PRs, matches existing trigger def pattern. Easier to extend than embedding in workflow YAML.

**Alternatives:** Workflow-only matrix (rejected — hard to maintain); JSON (acceptable but YAML matches deploy-mate/docs style).

Example shape:

```yaml
triggers:
  - id: create-tes-event
    trigger_def: triggers/create_tes_event.ts
    scope: global          # global | channel
    channels: []           # used when scope: channel
    enabled: true
  - id: complete-onboarding
    trigger_def: triggers/complete_onboarding.ts
    scope: global
    enabled: true
  - id: tes-onboard
    trigger_def: triggers/tes_onboard.ts
    scope: channel
    channels: []           # filled from SLACK_TRIGGER_CHANNEL_IDS at deploy
    enabled: false
```

### D2: Channel IDs from GitHub Variable at deploy time

**Choice:** When `scope: channel` and `channels` is empty in config, read `SLACK_TRIGGER_CHANNEL_IDS` (comma-separated Slack channel IDs, e.g. `C01234567,C08999999`).

**Rationale:** Channel IDs differ per workspace/environment; GitHub Variables already used for deploy config (`AGENT_SERVICE_URL`, etc.).

**Alternatives:** Commit channel IDs per env branch (rejected — leaks workspace structure); require manual `--trigger-def` per channel in config (acceptable fallback for advanced users).

### D3: One trigger instance per channel for channel scope

**Choice:** For each channel ID, provision a separate Slack trigger (suffix name with channel in CI logs if Slack allows duplicate titles; otherwise disambiguate in description).

**Rationale:** Slack channel shortcuts are bound to a channel; a single trigger cannot serve multiple channels.

### D4: Idempotent provision script

**Choice:** Shell script `slack-app/scripts/provision-triggers.sh`:
1. Parse config + env overrides
2. For each enabled entry, resolve channel list (inline config or env var)
3. `slack trigger list --json --app "$APP_ID" --token "$TOKEN" -s`
4. Match by trigger name + workflow/function + channel (when scoped)
5. `slack trigger update --trigger-id …` or `slack trigger create --trigger-def … --channel …` (exact flags validated against Slack CLI v4.6 during apply)

**Rationale:** Re-deploy must not fail on duplicate triggers. Matches pattern used for Render env sync (PUT replaces).

### D5: CI step placement and failure policy

**Choice:** New workflow step `Provision Slack triggers` immediately after `slack deploy`, same job, same `SLACK_SERVICE_TOKEN`. Step failure fails the job.

**Rationale:** Triggers are required for app usability; partial success (deployed app, no triggers) is worse than visible failure.

### D6: Channel scope for `create_tes_event` is optional extension

**Choice:** Default remains `global` per event-channel spec. Channel scope is opt-in via config for teams wanting the shortcut only in e.g. `#tes-ops`.

**Rationale:** Preserves MVP global shortcut requirement; satisfies user request for configurable scope.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Slack CLI channel flag undocumented/changed | Pin CLI install in workflow; verify flags in apply with dry-run or integration test; document version |
| Duplicate trigger names across channels | Include channel ID in trigger description; match by ID on update |
| `apps.json` missing on remote → CI prompts/fails | Commit `.slack/apps.json` as part of related Sea Trial work (prerequisite task) |
| Channel-scoped `create_tes_event` diverges from spec wording "global" | Spec delta clarifies global is default; channel is optional |

## Migration Plan

1. Add `triggers.config.yaml` with defaults (`create_tes_event` global, others as documented)
2. Implement and test `provision-triggers.sh` locally against Sea Trial dev workspace
3. Add CI step to `deploy.yml`
4. Update README — triggers section becomes "automatic on deploy" with config reference
5. First CI run provisions triggers; manual `slack trigger create` steps removed from checklist

**Rollback:** Revert workflow step; existing triggers remain in workspace (no auto-delete). Manual delete via Slack dashboard if needed.

## Open Questions

- Exact Slack CLI flag for channel-scoped shortcut create (`--channel` vs embedded in exported JSON) — resolve during apply by inspecting CLI help and one live test.
- Whether `complete_onboarding` should remain global shortcut or only block-action (currently both paths exist) — default: provision as global for link-trigger compatibility; no behavior change.
