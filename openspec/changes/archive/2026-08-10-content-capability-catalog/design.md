## Context

TES Event Process uses declarative Slack content under `slack-app/content/` with compilers in `slack-app/lib/content/`. Modals already follow Block Kit shape; lists partially diverge (flat `options[]`). JSON schemas in `slack-app/schemas/content/` validate file shape but not per-type property allowlists. Authors and agents need to know valid component types and options when editing content — with both IDE feedback and compile-time rejection.

Slack surfaces differ:

| Kind | Native model | TES extensions |
|------|--------------|----------------|
| modal | Block Kit `input` blocks + `element.type` | `contract`, `dynamic` |
| list | Slack Lists `schema[]` column types | `options_ref`, `seed`, `behavior` |
| message | Block Kit `blocks[]` | Handlebars conditionals in templates |
| canvas | Markdown templates | metadata injected by renderer (forbidden in author files) |

## Goals / Non-Goals

**Goals:**

- Single capability catalog as source of truth for valid types and properties per surface
- Slack-native vocabulary and payload shape for modals and lists
- JSON Schema (or equivalent) for IDE/agent authoring validation
- Compiler validation from the same catalog before Slack API calls
- Central `@domain/*` ref registry
- **Full Slack surface** in catalog, JSON Schema, and compilers for modals, lists, and messages

**Non-Goals:**

- Visual content builder UI
- agent-service or shared package schema changes
- Refactoring inline agent proposal blocks into `content/messages/`
- Artificial TES subset gates (`supported_in_tes`) that hide or block valid Slack types

## Decisions

### D1: Catalog as source of truth (not fat hand-written JSON Schema)

- **Choice:** JSON capability catalog under `slack-app/schemas/content/capabilities/` with a small generator or assembler producing JSON Schema fragments for content files
- **Reason:** Readable matrix of types/options; avoids duplicating Slack docs in schema by hand; TES extensions stay explicit
- **Considered alternatives:** Fat JSON Schema only (hard to maintain); TS-only registry (poor author discoverability)

### D2: Slack-native vocabulary and shape

- **Choice:** Use Block Kit `element.type` names and Lists `column.type` names; list select options use `options.choices` nested shape
- **Reason:** User requirement; reduces translation layer; compilers emit Slack payloads directly
- **Considered alternatives:** TES DSL (`short_answer`, `dropdown`) — rejected; friendly names map 1:1 to native types anyway (`multiline` for paragraph)

### D3: TES extensions namespaced and catalog-governed

- **Choice:** Allow only catalog-listed extensions: `contract`, `dynamic`, `options_ref`, `seed`, `behavior`; `options_ref` mutually exclusive with inline `options.choices`
- **Reason:** Clear boundary between Slack payload and TES compile-time overlays
- **Considered alternatives:** Implicit conventions — rejected (already caused scatter)

### D4: Canvas separate catalog (not Block Kit)

- **Choice:** `canvas.v1.json` rules: `.hbs.md` suffix, forbidden `<!-- tes-event-context -->` in author templates, optional documented template variables
- **Reason:** Canvas is markdown, not Block Kit; applying element enums would mislead authors
- **Considered alternatives:** Skip canvas validation — rejected; authors still need guardrails

### D5: Full Slack surface (no TES subset gate)

- **Choice:** Catalog, JSON Schema, and compilers SHALL cover the full Slack-documented surface per kind:
  - **Modal:** all Block Kit input block elements (`plain_text_input`, `rich_text_input`, `static_select`, `external_select`, `multi_static_select`, `users_select`, `multi_users_select`, `conversations_select`, `channels_select`, `radio_buttons`, `checkboxes`, `datepicker`, `datetimepicker`, `timepicker`, `number_input`, `email_text_input`, `url_text_input`, `file_input`)
  - **List:** all Slack Lists column types (`text`, `rich_text`, `select`, `multi_select`, `user`, `assignee`, `date`, `due_date`, `link`, `checkbox`, `number`, `email`, `phone`, `channel`, `attachment`, `message`, `canvas`, `rating`, `vote`, `completed`, …)
  - **Message:** all Block Kit blocks used in message payloads (`section`, `divider`, `image`, `actions`, `context`, `input`, `file`, `header`, `video`, `rich_text`, …)
- **Reason:** User requirement; authors/agents need the complete native vocabulary; compilers pass through valid Slack payloads without artificial restrictions
- **Considered alternatives:** `supported_in_tes` phased gate — rejected; hides valid Slack types and blocks authoring

### D6: Domain ref registry

- **Choice:** `domain-refs.v1.json` maps `@domain/<name>` → `content/domain/<file>.json`; compilers and validators use registry instead of switch statements
- **Reason:** Single registration point; aligns with `domain-reference-data` spec
- **Considered alternatives:** Keep per-compiler switches — rejected

## Risks / Trade-offs

- [Risk] Catalog drift from Slack API updates → Mitigation: version catalog (`*.v1.json`); link to Slack docs in catalog comments; periodic review
- [Risk] JSON Schema generation complexity at full surface size → Mitigation: generate from catalog programmatically; split per-surface schema files; link to Slack docs in catalog metadata
- [Risk] List JSON migration breaks existing files → Mitigation: migrate `incidents.json` in same change; single breaking migration with tests
- [Risk] Slack API adds new types → Mitigation: version catalog (`*.v1.json`); add new types in catalog updates; tests assert catalog parity with Slack reference docs

## Migration Plan

1. Add capability catalog files and validator module (no behavior change yet)
2. Wire compilers to validate via catalog; fix any existing content violations
3. Migrate `lists/incidents.json` to `options.choices` shape
4. Generate/update JSON Schema for IDE (`$schema` pointers on content files)
5. Remove hardcoded `options_ref` switches after registry wired
6. Rollback: revert compiler to prior validation (catalog files remain harmless)

Acceptance: `deno task test` passes; invalid fixture content fails validation with descriptive errors; existing modals/lists load unchanged (post migration).

## Open Questions

- Prefer Ajv at runtime vs hand-rolled validator reading catalog JSON?
- Should flat list `options[]` be rejected immediately or deprecated with warning?
- Source of truth for catalog updates when Slack adds types: manual curation vs periodic sync from Slack OpenAPI/docs?
