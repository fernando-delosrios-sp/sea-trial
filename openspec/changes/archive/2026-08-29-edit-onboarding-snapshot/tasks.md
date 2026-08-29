## 1. Shared type and seed bake (D2)

- [x] 1.1 Add optional `onboardingTriggerId` to `TesEventContext` in `packages/shared`
- [x] 1.2 After Onboarding Link Trigger create, persist trigger id and `onboardingLinkUrl` on context and write them into the compact snapshot via `workflows.triggers.update`
- [x] 1.3 Tests: deserialized seed snapshot includes `onboardingTriggerId` matching create response id and `onboardingLinkUrl` matching share URL

## 2. Modal prefill from snapshot (D4)

- [x] 2.1 Overlay all onboarding block initial values / selected options from `TesEventContext.onboarding` when present; keep Account-only prefill from `accountName` when `onboarding` is absent
- [x] 2.2 Tests: incomplete snapshot prefills Account only; complete snapshot with `onboarding` prefills suite, stakeholders, and other form fields; open still does not call `readCanvasMarkdown`

## 3. Submit refresh and announcement (D3, D5)

- [x] 3.1 On submit, if `onboardingTriggerId` is missing, fail with the same class of repair/re-seed error as a missing snapshot
- [x] 3.2 Compute post-submit context, update trigger `dashboard_canvas_content` to compact JSON, then `replaceCanvasContent` on Dashboard; do not call `readCanvasMarkdown`
- [x] 3.3 Post the agent-available channel message only when the incoming snapshot had `onboardingComplete === false`
- [x] 3.4 Tests: first submit updates trigger snapshot and posts announcement; second submit updates snapshot and Dashboard and does not post announcement; missing trigger id errors without canvas read

## 4. Repair

- [x] 4.1 Repair script writes `onboardingTriggerId` and `onboardingLinkUrl` into the snapshot it bakes after trigger create
- [x] 4.2 Tests or script-header docs: repair without a usable snapshot still cannot invent context; repair with JSON plus new trigger persists id

## 5. Verification

- [x] 5.1 Confirm canonical test command: `deno task test` in `slack-app/` (and `npm test` in `agent-service/` if untouched, record no regressions)
- [x] 5.2 All delta spec scenarios covered by named automated tests (seed trigger id, prefill after complete, re-submit refresh, missing id, no canvas read)

## 6. Documentation

- [x] 6.1 Update `docs/smoke-test-checklist.md`: after first submit, click Dashboard Complete onboarding, confirm prefill, edit and submit, confirm Dashboard and no second agent-available message
- [x] 6.2 Update repair script header / onboarding trigger comments to state the trigger snapshot is refreshed on submit
- [x] 6.3 Skip README API docs unless the trigger table needs a one-line note that Complete onboarding remains after submit for edits

## 7. Changelog

- [x] 7.1 Create or update changelog entry for this change via changelog-generator during apply
- [x] 7.2 Confirm entry covers user-visible changes: edit onboarding from Dashboard link, prefill last submit, no duplicate agent announcement
