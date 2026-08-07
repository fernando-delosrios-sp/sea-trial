# Design: Declarative Slack Content

## Context

After domain JSON (`domain-content-json`), UI content remains inline: modals in functions and `lib/`, canvas strings in `templates/index.ts`, list schemas in `lists.ts`, Block Kit in TypeScript builders. This change externalizes Slack UI content to versioned files with compilers — second step in the content-layer sequence.

## Goals / Non-Goals

**Goals:**
- JSON modals with `contract.block_ids` and `dynamic` overlay for domain-driven selects/prefill
- Handlebars MD canvases with metadata injected by code
- JSON list definitions with column `key` fields and `@domain/*` option refs
- Handlebars JSON for pinned index Block Kit
- Loaders under `lib/content/` with schema validation and contract tests
- Non-breaking: submit handlers and Slack API calls unchanged

**Non-Goals:**
- Channel composition manifest (`channel-composition-engine`)
- List behavior dispatcher beyond declarative stub
- `TesEventContext.slots` refactor

## Decisions

### D1: Modal JSON + dynamic overlay

**Choice:** `content/modals/*.json` with static Block Kit blocks; `dynamic` section declares prefill/options resolved at compile time from domain loader.

**Reason:** Single editorial source; compile step keeps submit parsers stable.

### D2: Handlebars for canvases and messages

**Choice:** `*.hbs.md` for canvases; `*.hbs.json` for Block Kit messages via `npm:handlebars`.

**Reason:** Editorial separation; conditionals for onboarding button and dashboard sections.

### D3: List JSON with domain refs

**Choice:** `content/lists/*.json` with `options_ref: "@domain/deliverable-statuses"` resolved at compile time.

**Reason:** Schema + select options in one file; stable column keys for future behavior.

### D4: Loader module tree

**Choice:** `modal-compiler.ts`, `canvas-renderer.ts`, `list-compiler.ts`, `message-renderer.ts`, re-exported from `loader.ts`.

**Reason:** Mirrors domain loader pattern; testable without Slack runtime.

### D5: JSON Schema files + manual validation

**Choice:** Schemas under `slack-app/schemas/content/`; validate in loaders (same approach as domain).

**Reason:** Consistent with existing repo pattern; no new runtime dependency.

### D6: Delete templates/index.ts

**Choice:** Remove after all consumers migrate to content loaders.

**Reason:** Eliminates duplicate content paths.

## Risks / Trade-offs

- [Risk] Handlebars output drift from inline templates → Mitigation: port existing tests to loaders
- [Trade-off] Large single PR → Accepted per brainstorm; complete separation in one change

## Migration Plan

1. Add content files mirroring current inline definitions
2. Add loaders, schemas, tests
3. Refactor consumers (seed, modals, lists, onboarding-submit)
4. Delete `templates/index.ts`
5. Run `npm test`

Rollback: revert loaders; restore `templates/index.ts`.

## Open Questions

None — scope locked in brainstorm.
