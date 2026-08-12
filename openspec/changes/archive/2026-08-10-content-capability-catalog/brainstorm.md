# Brainstorm: Content capability catalog

Raw capture of design exploration for knowing which options and components each content type admits when building Slack contents.

## Background

Authors and agents edit declarative content under `slack-app/content/` (modals, lists, canvases, messages). Modals are mostly Block Kit already; lists use a flattened options shape (`options[]` / `options_ref`) that diverges from Slack Lists API (`options.choices`). JSON schemas validate structure only (`columns[].type` is any string). Validity of component types and their properties is scattered in compilers (`modal-compiler.ts`, `list-compiler.ts`) via hand-rolled checks and hardcoded `@domain/*` switches.

User need: when building contents (e.g. modal question types like Short answer, Paragraph, Dropdown, Checkboxes, File upload), know which options are valid per content type — same for lists, canvases, etc.

Existing specs: `slack-ui-content`, `domain-reference-data`, `channel-composition`. Kind registry (`content/kinds/*.v1.json`) covers provision kinds, not field-level capabilities.

## Decision chain

### Q1: Primary consumer?

**Answer:** Authors and agents writing `content/*.json` (validate + autocomplete while editing).

### Q2: Failure mode?

**Answer:** Both editor-time (JSON Schema / IDE) and load-time (compiler rejects before Slack API). Single source of truth.

### Q3: Slack alignment model?

**Answer:** Slack-native vocabulary (Block Kit element types, Lists column types) — user wanted to see native names first.

Native modal input elements (Block Kit `element.type`):

- `plain_text_input` (short answer vs paragraph via `multiline`)
- `rich_text_input`
- `static_select`, `external_select`, `multi_static_select`
- `users_select`, `multi_users_select`, `conversations_select`, `channels_select`
- `radio_buttons`, `checkboxes`
- `datepicker`, `datetimepicker`, `timepicker`
- `number_input`, `email_text_input`, `url_text_input`
- `file_input`

Native list column types (`column.type`):

- `text`, `rich_text`, `select`, `multi_select`, `user`, `assignee`, `date`, `due_date`, `link`, `checkbox`, `number`, `email`, `phone`, `channel`, `attachment`, `message`, `canvas`, `rating`, `vote`, `completed`, etc.

Canvas and message surfaces differ: canvas = Handlebars markdown (not Block Kit fields); messages = Block Kit blocks (`section`, `actions`, …).

TES content today uses subset: modal `plain_text_input`, `static_select`, `multi_users_select`; list `text`, `user`, `select`, `date`, `link`.

### Q4: Shape fidelity?

**Answer:** Vocabulary **and** shape aligned to Slack where the surface is Block Kit or Lists API. TES-only extensions namespaced. Non–Block Kit surfaces (canvas) use separate rules — Block Kit rules do not apply.

Implications:

- Modals: keep Block Kit block/element JSON; tighten validation via catalog.
- Lists: migrate inline options to Slack shape `options: { format, choices[] }`; keep `options_ref` as TES extension resolved at compile time.
- Canvas: template/slot/metadata rules only.

### Q5: Approach?

**Chosen:** Capability catalog (JSON) → generated JSON Schema for IDE + compiler validation from same catalog.

**Rejected:**

- Fat JSON Schema only — hard to maintain Slack parity and TES extensions.
- TS registry only — poor author/agent discoverability without export step.

## Agreed design (summary)

```
Content file
    ├─ Slack-native payload (Block Kit / Lists schema)
    └─ TES extensions (contract, dynamic, options_ref, seed, behavior)

Catalog per surface:
  modal.v1, list.v1, message.v1, canvas.v1, extensions.v1, domain-refs.v1

Flow:
  content/*.json → IDE schema (catalog) + compiler validate → resolve @domain/* → Slack API payload
```

Catalog entries include:

- `slack_type` / native name
- `allowed_properties` / forbidden properties per type
- conditional rules (e.g. select requires `options.choices` or `options_ref`)

### Q6: Full Slack surface scope?

**Answer:** Include the **full Slack surface** in catalog, JSON Schema, and compilers — not an MVP subset gated by `supported_in_tes`. Authors may use any Slack-documented type for modals (all input elements), lists (all column types), and messages (all Block Kit blocks). Canvas remains separate (not Block Kit).

Central `@domain/*` registry replaces compiler switch statements.

Migration: `lists/incidents.json` flat `options[]` → `options.choices`; deliverables keeps `options_ref`; modals likely unchanged.

## Out of scope (MVP change)

- Visual builder UI
- Moving inline agent proposal blocks into `content/messages/`
- agent-service changes (content is slack-app only)

## Open questions (deferred to design)

- Codegen vs runtime schema assembly for IDE
- Versioning strategy when Slack adds new column/element types
