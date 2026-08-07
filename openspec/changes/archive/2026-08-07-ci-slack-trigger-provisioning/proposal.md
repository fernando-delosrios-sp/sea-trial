## Why

Slack app deploy via GitHub Actions succeeds but leaves the workspace without installed triggers. After the 2026-08-07 Sea Trial deploy, `slack trigger list` returned empty — users could not invoke "Create TES Event" until someone ran manual `slack trigger create` steps documented in the README. That gap makes every deploy incomplete and blocks smoke testing. Trigger installation should be automated in the same CI/CD pipeline as `slack deploy`, with configurable scope (global or channel-specific) so ops can restrict shortcuts to designated channels when needed.

## What Changes

**Trigger provisioning in deploy pipeline**
- From: Manual post-deploy `slack trigger create` documented in README
- To: Automated trigger install/update step in `deploy-slack-app` job after `slack deploy`
- Reason: Deploy must be end-to-end; no separate ops step
- Impact: Non-breaking; adds CI step

**Declarative trigger configuration**
- From: Hardcoded trigger paths in README only
- To: `slack-app/triggers.config.yaml` listing each trigger def, scope (`global` | `channel`), and optional channel IDs
- Reason: Extensible, reviewable config; supports per-trigger scope
- Impact: New config file; default preserves global shortcut for `create_tes_event`

**Environment-specific channel lists**
- From: No channel-scoped trigger support
- To: GitHub Variable `SLACK_TRIGGER_CHANNEL_IDS` (comma-separated) overrides/supplies channel IDs at deploy time when scope is `channel`
- Reason: Channel IDs are workspace-specific and should not be committed for all environments
- Impact: Optional GitHub Variable; documented in deploy checklist

**Idempotent trigger sync**
- From: `slack trigger create` only (fails on re-run if trigger exists)
- To: List → match → update or create per trigger definition
- Reason: Re-deploy must be safe
- Impact: New provision script invoked from workflow

## Capabilities

### New Capabilities

<!-- None — extends infrastructure and event-channel -->

### Modified Capabilities

- `infrastructure`: Add CI/CD requirements for automated Slack trigger provisioning after app deploy, declarative trigger config, and idempotent create/update behavior.
- `event-channel`: Extend provisioning entry point to support configurable global or channel-scoped shortcut for "Create TES Event" (global remains default).

## Impact

- **New files:** `slack-app/triggers.config.yaml`, `slack-app/scripts/provision-triggers.sh` (or equivalent)
- **Modified:** `.github/workflows/deploy.yml` — trigger provision step after `slack deploy`
- **Modified:** `README.md`, `docs/smoke-test-checklist.md`, `.deploy-mate/development/deployment.md` — remove manual trigger create as required step
- **Required for CI:** `slack-app/.slack/apps.json` committed so CLI targets app non-interactively
- **Optional GitHub Variable:** `SLACK_TRIGGER_CHANNEL_IDS` for channel-scoped triggers
- **Existing secret:** `SLACK_SERVICE_TOKEN` (already used for deploy)
- **Out of scope:** Slack App Home tab entry, message shortcuts, trigger deletion on config removal, multi-workspace org triggers
