## 1. Shared types

- [x] 1.1 Extend `TesEventContext` with `accountName`, `salesforceOpportunityUrl`, `memberUserIds`, `contextNotes`
- [x] 1.2 Rename `OnboardingForm.customerName` to `accountName` across shared types and consumers
- [x] 1.3 Add/update tests for context serialize/deserialize with new fields (`event_context_test.ts`)

## 2. Creation modal and trigger

- [x] 2.1 Implement `open_create_tes_event` function (modal with project name, Account, SF URL, multi_users_select, context notes)
- [x] 2.2 Implement creation modal view submission handler wiring to workflow inputs
- [x] 2.3 Update `create_tes_event` trigger to open modal via interactivity (replace broken shortcut inputs)
- [x] 2.4 Document `slack trigger create` / update steps for workspace deployment

## 3. Provision and seed

- [x] 3.1 Update `provision_channel` to accept `member_user_ids[]` and invite all members (+ trigger user)
- [x] 3.2 Remove hardcoded empty AE/SE inputs from workflow and trigger
- [x] 3.3 Update `seed_channel_objects` to pass creation fields into `TesEventContext` and dashboard template
- [x] 3.4 Update `dashboardTemplate` with `## Project` section (name, channel, account, SF link, members, notes, status)
- [x] 3.5 Add pinned index Block Kit with Complete onboarding button (`pinnedIndexMessage` / blocks helper)
- [x] 3.6 Tests: provision with member list (`provision_test.ts`); dashboard project section (`canvas_test.ts` or template test)

## 4. Onboarding updates

- [x] 4.1 Pre-fill Account in `open_onboarding` from `TesEventContext.accountName`
- [x] 4.2 Update submit handler to write submitted Account back to context and dashboard
- [x] 4.3 Wire Complete onboarding button to `open_onboarding` (block_actions or interactivity)
- [x] 4.4 Update pinned index post-onboarding copy to summon-only language
- [x] 4.5 Tests: Account pre-fill and overwrite (`onboarding_test.ts`); gate unchanged (`gate_test.ts`)

## 5. Copy and agent clarity

- [x] 5.1 Update requirements template and gate messages to summon-only wording
- [x] 5.2 Confirm no agent invoke on provision or onboarding submit (code review / test)

## 6. Verification

- [x] 6.1 Run `cd slack-app && deno task test`
- [x] 6.2 Run `openspec validate complete-provisioning-trigger --json`
- [ ] 6.3 Manual smoke: global shortcut → modal → channel with pinned button → onboarding → @mention gate

## 7. Documentation

- [x] 7.1 Update `docs/smoke-test-checklist.md` provisioning section for creation modal fields
- [x] 7.2 Update README or slack-app deploy notes with trigger creation steps
- [x] 7.3 N/A — no API contract changes for agent-service public docs

## 8. Changelog

- [x] 8.1 Create or update changelog entry for this change
- [x] 8.2 Confirm entry covers creation modal, Account terminology, and onboarding button CTA





