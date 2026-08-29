## 1. Snapshot serialize/deserialize (D2)

- [x] 1.1 Extend `deserializeEventContext` in `slack-app/lib/event-context.ts` to accept compact `JSON.stringify(TesEventContext)` as well as the existing metadata marker + fenced JSON block
- [x] 1.2 Tests: compact JSON round-trip; existing Dashboard metadata markdown still deserializes; invalid JSON fails

## 2. Bake snapshot into Onboarding Link Trigger (D1, D3)

- [x] 2.1 Pass seed-time `TesEventContext` into `createChannelOnboardingTrigger` and set workflow input `dashboard_canvas_content` to compact JSON (keep `channel_id` and `dashboard_canvas_id`)
- [x] 2.2 Wire the provisioner so the workflow step runs after context object IDs exist and the snapshot includes them
- [x] 2.3 Tests: `workflows.triggers.create` payload includes compact snapshot; missing Dashboard canvas still fails; unknown `link` still fails

## 3. Pinned index button (D4)

- [x] 3.1 Include compact snapshot in pinned Complete onboarding `buttonValueJson`
- [x] 3.2 Fail seeding if that button `value` would exceed 2000 characters
- [x] 3.3 Tests: button JSON contains snapshot and `accountName`; oversized payload fails seed

## 4. Open and submit without canvas read (D5)

- [x] 4.1 `open_onboarding` workflow and block-action paths: deserialize snapshot, prefill Account, put snapshot in `private_metadata`; do not call `readCanvasMarkdown`
- [x] 4.2 Submit path: deserialize snapshot, `processOnboardingSubmit` / `applyOnboarding`, `replaceCanvasContent` / `renderDashboardCanvasForSlack`; do not call `readCanvasMarkdown`
- [x] 4.3 Missing or invalid snapshot: clear error (re-create or repair); no canvas-read fallback
- [x] 4.4 Tests: Dashboard-link open with snapshot (no lookup); pinned button open with snapshot; submit updates Dashboard from snapshot; missing snapshot errors; `readCanvasMarkdown` not invoked

## 5. Repair and diagnostics (D6, D7)

- [x] 5.1 Repair script requires explicit `TES_EVENT_CONTEXT_JSON` (or equivalent); do not read canvas markdown; document env in script header
- [x] 5.2 Remove lookup/`files.info` probes from `canvas.ts` and `open_onboarding/mod.ts`
- [x] 5.3 Revert `buildOutgoingDomains` workspace-domain parameter, `manifest.ts` `SLACK_WORKSPACE_DOMAIN`, and gitignored `.env` key if added

## 6. Verification

- [x] 6.1 Confirm canonical test command: `deno task test` in `slack-app/` (agent-service untouched — record `npm test` not required for this change)
- [x] 6.2 All delta spec scenarios covered by named automated tests (trigger bake, button size, open/submit without read, missing snapshot, deserialize compact JSON)

## 7. Documentation

- [x] 7.1 Update `docs/smoke-test-checklist.md`: new channel required; Dashboard link and pinned button open modal with Account from create; old channels need re-seed or repair JSON
- [x] 7.2 Update `README.md` if trigger/onboarding description still implies canvas read
- [x] 7.3 Update headers/comments on `onboarding-channel-trigger.ts`, `open_onboarding`, and repair script: snapshot inputs, not canvas lookup

## 8. Changelog

- [x] 8.1 Create or update changelog entry for this change via changelog-generator during apply
- [x] 8.2 Confirm entry covers: onboarding uses seed-time snapshot; Dashboard write on submit; existing channels need re-create
