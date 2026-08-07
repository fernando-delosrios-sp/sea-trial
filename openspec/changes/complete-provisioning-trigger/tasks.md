## 1. Shared types

- [ ] 1.1 Extend `TesEventContext` with `accountName`, `salesforceOpportunityUrl`, `memberUserIds`, `contextNotes`
- [ ] 1.2 Rename `OnboardingForm.customerName` to `accountName` across shared types and consumers
- [ ] 1.3 Add/update tests for context serialize/deserialize with new fields (`event_context_test.ts`)

## 2. Creation modal and trigger

- [ ] 2.1 Implement `open_create_tes_event` function (modal with project name, Account, SF URL, multi_users_select, context notes)
- [ ] 2.2 Implement creation modal view submission handler wiring to workflow inputs
- [ ] 2.3 Update `create_tes_event` trigger to open modal via interactivity (replace broken shortcut inputs)
- [ ] 2.4 Document `slack trigger create` / update steps for workspace deployment

## 3. Provision and seed

- [ ] 3.1 Update `provision_channel` to accept `member_user_ids[]` and invite all members (+ trigger user)
- [ ] 3.2 Remove hardcoded empty AE/SE inputs from workflow and trigger
- [ ] 3.3 Update `seed_channel_objects` to pass creation fields into `TesEventContext` and dashboard template
- [ ] 3.4 Update `dashboardTemplate` with `## Project` section (name, channel, account, SF link, members, notes, status)
- [ ] 3.5 Add pinned index Block Kit with Complete onboarding button (`pinnedIndexMessage` / blocks helper)
- [ ] 3.6 Tests: provision with member list (`provision_test.ts`); dashboard project section (`canvas_test.ts` or template test)

## 4. Onboarding updates

- [ ] 4.1 Pre-fill Account in `open_onboarding` from `TesEventContext.accountName`
- [ ] 4.2 Update submit handler to write submitted Account back to context and dashboard
- [ ] 4.3 Wire Complete onboarding button to `open_onboarding` (block_actions or interactivity)
- [ ] 4.4 Update pinned index post-onboarding copy to summon-only language
- [ ] 4.5 Tests: Account pre-fill and overwrite (`onboarding_test.ts`); gate unchanged (`gate_test.ts`)

## 5. Copy and agent clarity

- [ ] 5.1 Update requirements template and gate messages to summon-only wording
- [ ] 5.2 Confirm no agent invoke on provision or onboarding submit (code review / test)

## 6. Verification

- [ ] 6.1 Run `cd slack-app && deno task test`
- [ ] 6.2 Run `openspec validate complete-provisioning-trigger --json`
- [ ] 6.3 Manual smoke: global shortcut → modal → channel with pinned button → onboarding → @mention gate

## 7. Documentation

- [ ] 7.1 Update `docs/smoke-test-checklist.md` provisioning section for creation modal fields
- [ ] 7.2 Update README or slack-app deploy notes with trigger creation steps
- [ ] 7.3 N/A — no API contract changes for agent-service public docs

## 8. Changelog

- [ ] 8.1 Create or update changelog entry for this change
- [ ] 8.2 Confirm entry covers creation modal, Account terminology, and onboarding button CTA
