## 1. Content files

- [x] 1.1 Add `content/modals/create-tes-event.json` and `onboarding.json` with `contract.block_ids`
- [x] 1.2 Add `content/lists/deliverables.json` and `incidents.json` with column keys and `@domain` refs
- [x] 1.3 Add `content/canvases/*.hbs.md` (dashboard, requirements, infrastructure)
- [x] 1.4 Add `content/messages/pinned-index.hbs.json`

## 2. Loader infrastructure

- [x] 2.1 Add JSON Schema files under `slack-app/schemas/content/`
- [x] 2.2 Add `modal-compiler.ts`, `canvas-renderer.ts`, `list-compiler.ts`, `message-renderer.ts`, `loader.ts`
- [x] 2.3 Add Handlebars to `deno.jsonc` imports
- [x] 2.4 Add `slack_content_test.ts` — schema validation, block_id contracts, @domain resolution

## 3. Consumer migration

- [x] 3.1 Refactor `open_create_tes_event/mod.ts` to use modal compiler
- [x] 3.2 Refactor `onboarding-modal.ts` to use modal compiler + dynamic overlay
- [x] 3.3 Refactor `lists.ts` to use list compiler
- [x] 3.4 Refactor `seed_channel_objects` and `onboarding-submit.ts` to use canvas/message renderers
- [x] 3.5 Delete `templates/index.ts`; update `dashboard_template_test.ts` and `create_tes_event_modal_test.ts`

## 4. Spec scenario coverage — slack-ui-content

- [x] 4.1 Test: create-tes-event modal block_ids match contract
- [x] 4.2 Test: onboarding modal block_ids match contract
- [x] 4.3 Test: list columns load with resolved domain status options
- [x] 4.4 Test: dashboard canvas renders Project section fields
- [x] 4.5 Test: pinned index blocks include/omit onboarding button

## 5. Documentation

- [x] 5.1 Update README — document declarative content layout and loaders
- [x] 5.2 Add changelog entry for declarative-slack-content

## 6. Archive

- [x] 6.1 Mark all tasks complete; write verify.md PASS
- [x] 6.2 Squash merge to main; run `openspec archive declarative-slack-content -y`
