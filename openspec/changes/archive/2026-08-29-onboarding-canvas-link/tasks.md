## 1. Composition contract (D6)

- [x] 1.1 Remove `bookmark` and `featured` from the onboarding workflow step in `slack-app/content/channels/tes-event.json` (keep `{ id, kind, link }` only)
- [x] 1.2 Reject `bookmark` and `featured` on workflow steps in `slack-app/lib/content/composition-resolver.ts`; keep canvas `tab` and list `bookmark` unchanged
- [x] 1.3 Update `slack-app/schemas/content/composition.schema.json` so workflow kind forbids `bookmark` and `featured`
- [x] 1.4 Add/adjust composition tests: tes-event manifest validates; workflow step with `bookmark` or `featured` fails; canvas `tab` and list `bookmark` still allowed

## 2. Per-channel Onboarding Link Trigger (D2, D3)

- [x] 2.1 Route `open_onboarding_workflow` unconditionally to `createChannelOnboardingTrigger` in `slack-app/lib/onboarding-channel-trigger.ts`; remove `associateWorkflowWithChannel` featured/shared path and `workflows.featured` client usage
- [x] 2.2 Name the trigger `Complete Onboarding ({channelId})`; bake `channel_id` and `dashboard_canvas_id`; grant channel-only run access
- [x] 2.3 Parse create response `trigger.id` or `trigger.trigger_id` and require `share_url` or `shortcut_url` (fail provision if share URL missing)
- [x] 2.4 Stop passing `{ bookmark, featured }` from `provisionWorkflowStep` in `slack-app/lib/content/channel-provisioner.ts`
- [x] 2.5 Tests: create is called once per channel with baked inputs and distinct title; `featured.add` is never called; unknown `link` fails; missing Dashboard canvas ID fails

## 3. Shortcut URL integrity and Dashboard CTA (D1, D4)

- [x] 3.1 Stop synthesizing `https://slack.com/shortcuts/{id}` in `resolveWorkflowTriggerShareUrl`; stop setting `SLACK_ONBOARDING_TRIGGER_URL` from ID-only trigger list output in `buildWorkflowTriggerEnvVars`
- [x] 3.2 Pass the create `share_url` into `finalizeDashboardCanvas`; fail seeding rather than write an ID-only shortcut href
- [x] 3.3 Tests: Dashboard markdown uses the API share URL; seeding fails when share URL is absent; after onboarding submit the Complete onboarding task renders ticked and keeps the trigger share URL
- [x] 3.4 Tests: pinned index Complete onboarding button path still opens the modal with Account prefill; Dashboard-link path uses baked dashboard canvas ID (no empty-dashboard error)

## 4. Shared trigger off and backfill (D5, D7)

- [x] 4.1 Set `complete-onboarding` to `enabled: false` in `slack-app/triggers.config.yaml`; leave `tes-onboard` disabled
- [x] 4.2 Confirm cleanup script still targets title `Complete Onboarding` exactly so it cannot delete `Complete Onboarding ({channelId})`
- [x] 4.3 Repurpose `slack-app/scripts/repair-workflow-tab.ts` to create the per-channel trigger and rewrite the Dashboard onboarding link for `CHANNEL_ID` + Dashboard canvas ID; document required env vars in the script header

## 5. Verification

- [x] 5.1 Confirm canonical test command: `deno task test` in `slack-app/` (and `npm test` in `agent-service/` if that package is untouched, still record no regressions)
- [x] 5.2 All delta spec scenarios covered by named automated tests (composition flags, trigger create, share URL, Dashboard hide-after-submit, unknown link, missing dashboard)

## 6. Documentation

- [x] 6.1 Update `README.md` trigger table: disable shared Complete Onboarding; describe Dashboard canvas link as the onboarding CTA
- [x] 6.2 Update `docs/smoke-test-checklist.md`: replace Workflows tab checks with Dashboard Complete onboarding link; keep pinned index button
- [x] 6.3 Update script/header comments in `onboarding-channel-trigger.ts`, `complete_onboarding.ts`, and the repair script so they no longer claim Workflows tab surfacing

## 7. Changelog

- [x] 7.1 Create or update changelog entry for this change via changelog-generator during apply
- [x] 7.2 Confirm entry covers user-visible changes: Dashboard onboarding link, no Workflows tab, no shared Complete Onboarding shortcut, per-channel trigger naming
