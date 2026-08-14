# Design: Workflow Channel Surfacing

## Context

TES Event channels declare workflow steps in `tes-event.json`. Onboarding uses `open_onboarding_workflow` but the provisioner creates a new shortcut trigger per channel, causing duplicate global shortcuts and undeclared Workflows tab surfacing. Slack exposes separate surfaces: list header bookmarks (`bookmarks.add`), Workflows tab bookmarked list, and Workflows tab featured (`workflows.featured.add`).

## Goals / Non-Goals

**Goals:**

- Add opt-in `bookmark` and `featured` flags on workflow steps (distinct from list header `bookmark`)
- Bookmark onboarding in Workflows tab via shared deploy-time trigger + channel permissions
- Limit trigger run access to the provisioned channel (`named_entities` + `channel_ids`)
- Single shared onboarding trigger — no `triggers.create` per channel
- Update `tes-event` onboarding step with `bookmark: true`

**Non-Goals:**

- Featured onboarding workflow (composer button) in MVP
- Automated cleanup of legacy per-channel triggers
- Public API discovery spike beyond documented `workflows.featured.*` and trigger permissions

## Decisions

### D1: Workflow surfacing flags separate from list bookmark

- **Choice:** `bookmark: true` on `kind: workflow` means Workflows tab bookmarked; on `kind: list` means header `bookmarks.add`. Optional `featured: true` only on workflow steps.
- **Reason:** Same opt-in pattern as canvas `tab`, different API per kind
- **Considered alternatives:** Separate keys `workflow_bookmark` (rejected — verbose); reuse list bookmark for workflows (rejected — wrong surface)

### D2: Shared deploy-time link trigger

- **Choice:** One onboarding link trigger created/updated at deploy (`complete_onboarding.ts`); runtime resolves trigger ID by `link` key (`open_onboarding_workflow`); inputs use `TriggerContextData.Shortcut.channel_id` dynamically
- **Reason:** One shortcut name in palette; channel resolved at invoke
- **Considered alternatives:** Per-channel triggers (rejected — duplicates); global shortcut only without Workflows tab (rejected — misses tab UX)

### D3: Channel-only run permissions

- **Choice:** On provision, `permissions.set(trigger_id, named_entities)` then `permissions.add(trigger_id, channel_ids: [channelId])`
- **Reason:** Restrict who can run trigger to channel members
- **Considered alternatives:** `everyone` (rejected); baked channel_id in trigger inputs (rejected — prevents sharing)

### D4: Workflows tab bookmark implementation

- **Choice:** Associate shared trigger with channel via trigger permissions API; spike confirms this populates Bookmarked workflows section (matches current per-channel create behavior in UI)
- **Reason:** No public `workflows.bookmarked.add` method documented
- **Considered alternatives:** `bookmarks.add` with shortcut URL (rejected — header bar, not Workflows tab)

### D5: Featured workflows

- **Choice:** When `featured: true`, call `workflows.featured.add({ channel_id, trigger_ids: [id] })` after permissions grant
- **Reason:** Documented API for featured surface
- **Considered alternatives:** Skip featured until requested (accepted for onboarding; flag exists for future steps)

### D6: Trigger ID resolution

- **Choice:** Map `link` → trigger ID via env var `SLACK_ONBOARDING_TRIGGER_ID` set at deploy, or lookup from `slack trigger list` by name during provision (fallback)
- **Reason:** Provisioner needs stable ID without creating triggers
- **Considered alternatives:** Hardcode trigger ID (rejected — environment-specific)

## Risks / Trade-offs

- [Risk] Bot token cannot call `workflows.featured.add` on tenant → Mitigation: spike; defer `featured` usage until confirmed
- [Risk] Bookmarked workflow association differs from permissions-only → Mitigation: integration test + manual smoke on Workflows tab
- [Trade-off] Legacy per-channel triggers remain in workspace → Accepted; document cleanup
- [Trade-off] `dashboard_canvas_id` not in shared trigger inputs → Resolved at invoke via existing button/value paths

## Migration Plan

1. Enable deploy-time onboarding link trigger; record trigger ID in env or deploy output
2. Refactor `provisionOnboardingChannelShortcut` → `associateWorkflowWithChannel`
3. Extend schema/resolver for workflow `bookmark`/`featured`
4. Update `tes-event.json` onboarding step
5. Update tests and smoke checklist
6. Run `deno task test` in slack-app/

Rollback: revert to per-channel `triggers.create` path.

## Open Questions

- Confirm bot can invoke `workflows.featured.add` on Slack Pro dev tenant (spike during apply)
