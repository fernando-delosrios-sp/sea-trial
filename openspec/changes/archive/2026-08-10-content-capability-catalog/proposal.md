## Why

Authors and agents editing `slack-app/content/` cannot reliably tell which component types and properties are valid for modals, lists, messages, and canvases. Validity is scattered in compilers and loose JSON schemas (`type: string`), causing invalid content to slip through or requiring tribal knowledge of Block Kit and Slack Lists APIs. A single capability catalog aligned to Slack-native vocabulary and shape will give IDE validation and compile-time enforcement from one source.

## What Changes

**Content validation model**
- From: Structural JSON schemas and hand-rolled compiler checks with hardcoded `@domain/*` switches
- To: Versioned capability catalog per surface (modal, list, message, canvas) driving JSON Schema for editors and compiler validation
- Reason: Authors/agents need discoverable, enforceable rules for valid options per content type
- Impact: Non-breaking for modals; list JSON shape migration for inline select options

**List select options shape**
- From: Flat `options: [{ value, label }]`
- To: Slack-aligned `options: { format, choices: [{ value, label, color? }] }` with TES `options_ref` extension
- Reason: Align authored content to Slack Lists API shape
- Impact: Breaking for list JSON authors; compiler resolves refs to `options.choices`

**Domain reference resolution**
- From: `if (ref === "@domain/...")` in individual compilers
- To: Central `@domain/*` registry in capability layer
- Reason: Single place to register valid refs and their source files
- Impact: Non-breaking behavior; structural refactor

**Canvas rules**
- From: Implicit conventions in renderer
- To: Explicit canvas capability rules (template constraints, forbidden metadata in author templates)
- Reason: Block Kit rules do not apply; canvas needs its own author guidance
- Impact: Non-breaking; additive validation

**Full Slack surface coverage**
- From: Partial type support hardcoded in compilers; no authoritative list of valid types/options
- To: Catalog, JSON Schema, and compilers cover the **full Slack-documented surface** for modals (all input block elements), lists (all column types), and messages (all Block Kit blocks)
- Reason: Authors/agents must know and use the complete native vocabulary without artificial TES subset gates
- Impact: Larger catalog files; compilers must pass through full Slack payloads for all documented types

## Capabilities

### New Capabilities

- `content-capability-catalog`: Versioned catalog of the full Slack component surface (modal input elements, list column types, message Block Kit blocks), properties, and TES extensions per content surface; JSON Schema generation; compiler validation; `@domain/*` ref registry

### Modified Capabilities

- `slack-ui-content`: Content loader validation SHALL use capability catalog; list select options SHALL use Slack-native shape; compilers SHALL reject invalid type/property combinations
- `domain-reference-data`: Domain refs SHALL be registered in the capability catalog and resolved centrally

## Impact

- **slack-app/schemas/content/** — new `capabilities/` catalog; existing schemas generated or `$ref` catalog
- **slack-app/lib/content/** — `modal-compiler.ts`, `list-compiler.ts`, new `capability-validator.ts`, refactored domain ref resolution
- **slack-app/content/lists/** — migrate `incidents.json` options shape; validate `deliverables.json`
- **slack-app/content/modals/** — no shape change expected; stricter validation
- **Tests** — full-surface catalog coverage, invalid property rejection, list options shape, `@domain/*` resolution, compile-through for all Slack types
- **Out of scope:** agent-service, packages/shared (unless ref types needed later), visual builder UI
