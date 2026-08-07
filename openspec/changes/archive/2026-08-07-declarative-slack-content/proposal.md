## Why

Modal views, list schemas, canvas markdown, and pinned index Block Kit are defined inline across `lib/`, `functions/`, and `templates/index.ts`, mixing editorial content with behavior. That makes copy changes require code edits, duplicates modal definitions (e.g. Create TES Event modal in a function file), and prevents validation of block_id contracts against submit parsers. Externalizing Slack UI content to versioned files with compilers separates content from code and enables CI validation before the channel composition layer lands.

## What Changes

**Modal content (JSON)**
- From: Inline Block Kit in `open_create_tes_event/mod.ts` and `onboarding-modal.ts`
- To: `content/modals/*.json` with `dynamic` overlay + `contract.block_ids` for drift tests
- Reason: Slack modals are JSON-native; single source per modal
- Impact: Non-breaking; submit handlers unchanged

**Canvas content (Handlebars MD)**
- From: String builders in `templates/index.ts`
- To: `content/canvases/*.hbs.md` rendered via Handlebars; metadata block injected by code
- Reason: Editorial separation; conditional sections via `{{#if}}`
- Impact: Non-breaking; same output at seed/onboarding

**List definitions (JSON)**
- From: `DELIVERABLES_COLUMNS` / `INCIDENTS_COLUMNS` constants in `lists.ts`
- To: `content/lists/*.json` with columns, empty seed, `behavior.field_change` declarations
- Reason: Schema + select options + future behavior in one file; stable column `key` fields
- Impact: Non-breaking; adopt Slack `key` on columns

**Messages (Handlebars JSON)**
- From: `pinnedIndexMessage()` / `pinnedIndexBlocks()` in `templates/index.ts`
- To: `content/messages/pinned-index.hbs.json`
- Reason: Block Kit with conditional onboarding button in one template
- Impact: Non-breaking

**Loader infrastructure**
- From: No content layer
- To: `lib/content/*` loaders/compilers + JSON Schema validation + tests (pattern: `triggers-config.ts`)
- Reason: Validate refs (`@domain/*`) at test time
- Impact: New module tree; delete `templates/index.ts` after migration

## Capabilities

### New Capabilities

- `slack-ui-content`: Declarative modals (JSON), canvases (Handlebars MD), lists (JSON schema/seed/behavior), and messages (Handlebars Block Kit) with loaders, schema validation, and block_id contract tests.

### Modified Capabilities

- `event-channel`: Creation modal and seeded canvas/list/message content SHALL be loaded from declarative content files, not inline code.
- `onboarding`: Onboarding modal content SHALL be loaded from declarative JSON; suite options SHALL reference domain JSON.
- `deliverables`: List column schema and status select choices SHALL be defined in declarative list JSON.

## Impact

- **New:** `slack-app/content/modals|lists|canvases|messages/`, `slack-app/lib/content/`, `slack-app/schemas/`, Handlebars dependency in `deno.jsonc`
- **Removed:** `slack-app/templates/index.ts`, inline modal in `open_create_tes_event/mod.ts`, column constants in `lists.ts`
- **Modified:** `seed_channel_objects`, `open_onboarding`, list create helpers, related tests
- **Deferred:** Channel composition manifest (`channel-composition-engine`); list behavior dispatcher Phase 1 may stub only
- **Sequence:** Change 2 of 3 — depends on `domain-content-json`
