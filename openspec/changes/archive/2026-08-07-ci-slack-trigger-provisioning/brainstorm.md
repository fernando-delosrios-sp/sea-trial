<!--
Raw capture — CI Slack trigger provisioning exploration.
Session 2026-08-07 — triggered by deploy gap: Sea Trial deployed with zero triggers.
-->

## Background

The GitHub Actions deploy workflow (`deploy.yml`) deploys slack-app via `slack deploy` and syncs runtime env vars, but **does not install workflow triggers**. After the 2026-08-07 Sea Trial deploy, `slack trigger list --app A0BNHB84NCT` returned empty — users cannot invoke "Create TES Event" without manual `slack trigger create`.

Trigger definitions already exist in `slack-app/triggers/`:
- `create_tes_event.ts` — starts `create_tes_event` workflow (primary MVP entry)
- `complete_onboarding.ts` — opens onboarding from pinned index (link/shortcut)
- `tes_onboard.ts` — legacy channel shortcut fallback

README documents manual post-deploy steps. Smoke checklist marks trigger create as pending manual ops.

## Decision chain

### Q1: What problem are we solving?

**Answer:** Deploy is incomplete without triggers. Ops should not run a separate manual CLI step after every CI deploy. Trigger installation must be part of the same pipeline as `slack deploy`.

### Q2: Which triggers belong in CI?

**Answer:** At minimum `create_tes_event` (MVP entry). Also provision `complete_onboarding` and optionally `tes_onboard` — all triggers listed in a declarative config so CI iterates them. Default set matches README.

### Q3: Global vs channel scope?

**Answer:** User wants a **config option per trigger**:
- `global` — workspace-wide shortcut (default for `create_tes_event`)
- `channel` — shortcut available only in listed channels

When scope is `channel`, ops provides a **channel ID list** (comma-separated or YAML array). CI creates one Slack trigger per channel (Slack model: channel shortcuts are per-channel).

Development default: `create_tes_event` → `global`. Channel scope reserved for teams that want the shortcut only in a `#tes-hub` or similar admin channel.

### Q4: Where does configuration live?

**Approaches considered:**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| A. Repo file only (`triggers.config.yaml`) | Versioned, reviewable | Channel IDs differ per workspace | **Base config** |
| B. GitHub Variable override for channel IDs | Per-env without code change | Another secret surface | **Override layer** |
| C. Hardcode in workflow | Simple | Not extensible | Rejected |

**Decision:** Checked-in `slack-app/triggers.config.yaml` defines trigger defs + default scope. Optional GitHub Variable `SLACK_TRIGGER_CHANNEL_IDS` (or per-trigger override) supplies channel IDs at deploy time when scope is `channel` and repo config leaves `channels: []`.

### Q5: Create vs update (idempotency)?

**Answer:** Re-deploy must not fail if triggers already exist. Provision script SHALL:
1. `slack trigger list --json` (non-interactive: `--app`, `--token`, `-s`)
2. Match existing triggers by name + workflow/function reference
3. `slack trigger update --trigger-id <id> --trigger-def <file>` when found, else `slack trigger create --trigger-def <file>`

Channel-scoped triggers match by name + channel_id.

### Q6: Non-interactive CI constraints?

**Answer:** CI must pass `--app`, `--token`, `-s`, `--force` flags. Requires `slack-app/.slack/apps.json` committed (Sea Trial `A0BNHB84NCT`) so CLI targets the correct app without TTY prompts.

For channel scope, investigate Slack CLI flags (`--channel` or channel field in trigger def JSON export). If CLI requires channel in def, provision script generates ephemeral JSON from template + channel ID.

## Design trade-offs

- **Channel ID portability:** Channel IDs are workspace-specific; keep them in GitHub Variables for dev/staging/prod rather than committing real IDs to main (unless dev-only repo).
- **Trigger duplication:** N channels → N trigger instances with same name pattern (e.g. "Create TES Event (#general)"). Acceptable; list step makes this visible in CI logs.
- **Scope vs event-channel spec:** MVP spec says "global shortcut"; this change adds optional channel scope without removing global default.
- **Failure mode:** Trigger provision failure should fail the deploy job (same as `slack deploy` failure) so partial deploys are visible.

## Open items resolved

- Config format: YAML in repo + optional GitHub Variable for channel IDs
- Default scope for `create_tes_event`: global
- All three trigger defs included in default config; `tes_onboard` marked optional/disabled by default
