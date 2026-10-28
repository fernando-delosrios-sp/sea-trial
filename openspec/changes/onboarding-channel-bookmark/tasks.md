## 1. TES Event Context Store

- [x] 1.1 Define the Slack Datastore in `slack-app/manifest.ts` with primary key channel ID and compact `TesEventContext` JSON
- [x] 1.2 Add a datastore helper with `get`/`put` and tests for round-trip and miss
- [x] 1.3 Drop `onboardingTriggerId` and `onboardingLinkUrl` from `TesEventContext`; update `event_context_test.ts`

## 2. Global shortcut

- [x] 2.1 Enable `complete-onboarding` in `triggers.config.yaml` (`scope: global`, `enabled: true`)
- [x] 2.2 Keep `Complete onboarding` inputs as `interactivity` plus `channel_id` from shortcut context
- [x] 2.3 Delete `slack-app/triggers/tes_onboard.ts` and drop it from the config
- [x] 2.4 Test deploy-config lists both Create TES Event and Complete onboarding as enabled global entries

## 3. Composition without per-channel workflow steps

- [x] 3.1 Reject `kind: workflow` in `composition.schema.json` and the resolver
- [x] 3.2 Remove the onboarding workflow step from `tes-event.json`
- [x] 3.3 Delete per-channel trigger create (`onboarding-channel-trigger.ts`, `workflow-trigger-registry.ts`) and their tests
- [x] 3.4 Remove the workflow branch from `channel-provisioner.ts`
- [x] 3.5 Update `composition_test.ts` for the rejected kind and a manifest with no workflow step

## 4. Seed: put + grant

- [x] 4.1 After composition steps, `put` the TES Event Context Store row for the new channel
- [x] 4.2 Grant the global `Complete onboarding` trigger to that channel (`permissions.add` / `channel_ids`)
- [x] 4.3 Fail seed with a clear error if `put` or grant fails
- [x] 4.4 Test seed writes the row, grants the channel, and creates no `Complete Onboarding ({channelId})` trigger

## 5. Open and submit

- [x] 5.1 Open onboarding: `get` by shortcut `channel_id`; miss or bad JSON fails clearly; never `readCanvasMarkdown`
- [x] 5.2 Submit: `put` the updated row; first complete still announces; re-submit does not announce again
- [x] 5.3 Fail submit clearly when `put` fails
- [x] 5.4 Test TES channel open, non-TES miss, prefill after complete, re-submit, and put failure

## 6. Pinned index and Dashboard

- [x] 6.1 Remove Complete onboarding / Edit onboarding buttons from `pinned-index.hbs.json`
- [x] 6.2 Dashboard onboarding task instructs the user to run `Complete onboarding`; never write `https://slack.com/shortcuts/`
- [x] 6.3 Update dashboard and pinned-index tests

## 7. Cleanup and repair

- [x] 7.1 Extend `cleanup-onboarding-triggers.ts` to match `Complete Onboarding ({channelId})` and exact `Complete Onboarding`; never match `Create TES Event`
- [x] 7.2 Repair script `put`s a store row and grants the global shortcut; creates no per-channel trigger; rename away from "workflow tab"
- [x] 7.3 Tests for title matching and repair outputs
- [x] 7.4 After deploy, run cleanup and confirm the shortcut menu has `Create TES Event` plus one `Complete onboarding` (no per-channel names)

## 8. Verification

- [x] 8.1 Canonical test command: `deno task test` from `slack-app/`
- [x] 8.2 All delta spec scenarios covered by named automated tests
- [ ] 8.3 Manual smoke: seed a TES Event Channel, open `Complete onboarding` there, submit, re-open with prefill
- [ ] 8.4 Confirm `#oppties` shows at most one `Complete onboarding` for a TES member, and that invoking it there fails clearly
- [ ] 8.5 Confirm a user in no TES Event Channel does not see `Complete onboarding`

## 9. Documentation

- [x] 9.1 Update `docs/smoke-test-checklist.md` for the global shortcut, store, and grant
- [x] 9.2 Update `README.md` where onboarding discovery is described
- [x] 9.3 Update repair/cleanup usage notes

## 10. Changelog

- [x] 10.1 Create the changelog entry with changelog-generator
- [x] 10.2 Confirm it covers the store, the global shortcut, retired per-channel triggers, and the breaking `TesEventContext` field removal
