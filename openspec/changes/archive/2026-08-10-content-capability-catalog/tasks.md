## 1. Capability catalog foundation (full Slack surface)

- [x] 1.1 Create `slack-app/schemas/content/capabilities/modal.v1.json` with **all** Block Kit input element types and allowed/forbidden properties per Slack docs
- [x] 1.2 Create `slack-app/schemas/content/capabilities/list.v1.json` with **all** Slack Lists column types and type-specific `options` shapes
- [x] 1.3 Create `slack-app/schemas/content/capabilities/message.v1.json` with **all** Block Kit block types for message templates
- [x] 1.4 Create `slack-app/schemas/content/capabilities/canvas.v1.json` with template rules (suffix, forbidden metadata)
- [x] 1.5 Create `slack-app/schemas/content/capabilities/extensions.v1.json` for TES extensions (`contract`, `dynamic`, `options_ref`, `seed`, `behavior`)
- [x] 1.6 Create `slack-app/schemas/content/capabilities/domain-refs.v1.json` mapping `@domain/*` to domain JSON files
- [x] 1.7 Add catalog parity test asserting modal, list, and message catalogs enumerate the full Slack-documented type sets

## 2. Validator and schema generation

- [x] 2.1 Implement `slack-app/lib/content/capability-validator.ts` loading catalog and validating modal/list/message/canvas content
- [x] 2.2 Add tests: full modal element catalog documented; unknown modal element type rejected
- [x] 2.3 Add tests: full list column catalog documented; text column with `options` rejected; flat options array rejected
- [x] 2.4 Add tests: full message block catalog documented; unknown block type rejected
- [x] 2.5 Generate or assemble JSON Schema for modals, lists, and messages from catalog; wire `$schema` on content files
- [x] 2.6 Add tests: modal/list/message content files resolve full-surface schema constraints

## 3. Compiler integration (compile-through for all Slack types)

- [x] 3.1 Wire `modal-compiler.ts` through capability validator; accept all catalog-listed input elements; reject forbidden properties only
- [x] 3.2 Wire `list-compiler.ts` through capability validator; accept all catalog-listed column types; resolve `options_ref` via domain ref registry
- [x] 3.3 Wire message renderer/validator through capability catalog for Block Kit blocks
- [x] 3.4 Emit Slack-native list schema with full column options (including `options.choices` from refs or inline)
- [x] 3.5 Add tests: `rich_text_input`, `file_input`, `checkboxes` modal elements compile through unchanged
- [x] 3.6 Add tests: `multi_select`, `rating`, `checkbox` list columns compile through with valid options
- [x] 3.7 Add tests: `options_ref` resolves to choices; conflicting ref + inline choices rejected
- [x] 3.8 Add tests: unknown `@domain/*` ref rejected (domain ref registry scenarios)
- [x] 3.9 Remove hardcoded `options_ref` switch statements from compilers after registry wired

## 4. Content migration

- [x] 4.1 Migrate `slack-app/content/lists/incidents.json` to `options: { format, choices[] }` shape
- [x] 4.2 Verify `deliverables.json` validates with `options_ref` only (no inline choices)
- [x] 4.3 Add canvas validation: reject author templates containing `<!-- tes-event-context -->`
- [x] 4.4 Add tests: valid canvas template passes; metadata in author template fails

## 5. Domain reference data alignment

- [x] 5.1 Register `@domain/deliverable-statuses` and `@domain/sailpoint-suites` in domain ref registry
- [x] 5.2 Add tests: both refs registered and resolve correctly (domain-reference-data scenarios)

## 6. Regression and integration

- [x] 6.1 Update existing content loader tests for capability-catalog validation paths
- [x] 6.2 Run `deno task test` in slack-app; fix any regressions from stricter validation
- [x] 6.3 Confirm existing modals load unchanged under new validation

## 7. Documentation

- [x] 7.1 Add author guide listing full Slack surface per content kind (modal elements, list columns, message blocks)
- [x] 7.2 Document list options shape migration (`options.choices`) and `options_ref` usage
- [x] 7.3 Update inline comments in capability JSON files linking to Slack Block Kit / Lists API references

## 8. Changelog

- [x] 8.1 Create or update changelog entry for content capability catalog (invoke changelog-generator)
- [x] 8.2 Confirm entry covers full Slack surface coverage, list shape migration, and domain ref registry
