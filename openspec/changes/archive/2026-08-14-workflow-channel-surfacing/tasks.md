## 1. Schema and composition model

- [x] 1.1 Extend composition schema: workflow steps allow optional `bookmark` and `featured` (const true); forbid on canvas/list cross-use
- [x] 1.2 Update `composition-resolver.ts` to parse workflow `bookmark`/`featured` and validate unknown workflow links
- [x] 1.3 Add `"bookmark": true` to onboarding step in `tes-event.json`

## 2. Shared trigger and deploy config

- [x] 2.1 Enable deploy-time onboarding link trigger in `triggers.config.yaml` (or document env trigger ID injection)
- [x] 2.2 Ensure `complete_onboarding.ts` uses dynamic `TriggerContextData.Shortcut.channel_id` (no baked channel ID)
- [x] 2.3 Add workflow link → trigger ID registry (env var and/or trigger list lookup)

## 3. Provisioner refactor

- [x] 3.1 Replace per-channel `triggers.create` with shared trigger resolve + `permissions.set`/`permissions.add` for channel-only access
- [x] 3.2 Implement workflow `bookmark: true` surfacing (Workflows tab bookmarked association)
- [x] 3.3 Implement workflow `featured: true` via `workflows.featured.add` when flag present
- [x] 3.4 Update `channel-provisioner.ts` workflow step handler to pass bookmark/featured flags

## 4. Tests

- [x] 4.1 Schema tests: workflow bookmark/featured valid; invalid cross-kind flags rejected
- [x] 4.2 `onboarding_channel_trigger_test.ts`: shared trigger + permissions.add, no create per channel
- [x] 4.3 Provisioner integration: single trigger create call count zero for second channel; permissions.add per channel
- [x] 4.4 Composition test: tes-event onboarding step has bookmark true

## 5. Documentation

- [x] 5.1 Update README workflow step surfacing (`bookmark` vs list bookmark, `featured`)
- [x] 5.2 Update smoke checklist: onboarding in Workflows tab bookmarked list; note duplicate shortcut cleanup for legacy channels

## 6. Changelog

- [x] 6.1 Create or update changelog entry for workflow surfacing and shared onboarding trigger
- [x] 6.2 Confirm entry covers duplicate shortcut fix and Workflows tab bookmark behavior
