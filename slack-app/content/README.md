# Slack content authoring

Declarative UI content lives under this directory. Valid component types and options are defined by the **capability catalog** in `slack-app/schemas/content/capabilities/`.

## Surfaces

| Kind | Path | Native model |
|------|------|--------------|
| Modal | `modals/*.json` | Block Kit `input` blocks + `element.type` |
| List | `lists/*.json` | Slack Lists `columns[].type` |
| Message | `messages/*.hbs.json` | Block Kit `blocks[]` (after Handlebars render) |
| Canvas | `canvases/*.hbs.md` | Handlebars markdown (not Block Kit) |

JSON Schema for modals and lists: `slack-app/schemas/content/modal.schema.json`, `list.schema.json`. Message templates use Handlebars source (`.hbs.json`); rendered Block Kit blocks are validated against `message-blocks.schema.json`. See `messages/pinned-index.meta.json` for the schema link.

## Modal input elements (full Slack surface)

All Block Kit input `element.type` values are valid:

`plain_text_input`, `rich_text_input`, `static_select`, `external_select`, `multi_static_select`, `users_select`, `multi_users_select`, `conversations_select`, `channels_select`, `radio_buttons`, `checkboxes`, `datepicker`, `datetimepicker`, `timepicker`, `number_input`, `email_text_input`, `url_text_input`, `file_input`

Short answer vs paragraph: same type — `plain_text_input` with `multiline: true|false`.

TES extensions at file root: `contract` (required), `dynamic` (optional overlay for `@domain/*` refs).

## List columns (full Slack surface)

All Slack Lists column types are valid:

`text`, `rich_text`, `select`, `multi_select`, `user`, `assignee`, `date`, `due_date`, `link`, `checkbox`, `number`, `email`, `phone`, `channel`, `attachment`, `message`, `canvas`, `rating`, `vote`, `completed`

### Select options shape (Slack-native)

```json
{
  "key": "status",
  "name": "Status",
  "type": "select",
  "options": {
    "format": "single_select",
    "choices": [
      { "value": "open", "label": "Open", "color": "red" }
    ]
  }
}
```

Or use domain vocabulary via TES extension (mutually exclusive with inline `options.choices`):

```json
{
  "key": "status",
  "name": "Status",
  "type": "select",
  "options_ref": "@domain/deliverable-statuses"
}
```

Registered domain refs: `@domain/deliverable-statuses`, `@domain/customer-deliverable-statuses`, `@domain/sailpoint-suites` (modal dynamic overlay only).

## Delivery Template Canvas

Per-deliverable delivery documentation created when a list row reaches **Validation required** (not on Accept).

- **Template:** `canvases/delivery.hbs.md` — customer sections (business value, visual proof, components, technologies, customer summary) and internal sections (artefacts, configuration, notes)
- **Agent:** Delivery agent consolidates draft content via `POST /agents/delivery/consolidate`; review flag cleared manually via **Mark reviewed**
- **Canvas actions:** **Consolidate draft** and **Mark reviewed** links in canvas metadata
- **Situation Report excerpt:** Pulled from `## Customer summary` when review flag is cleared (500 char soft cap)

## Situation Report canvas

Customer-facing periodic snapshot of Deliverables List state.

- **Template:** `canvases/situation-report.hbs.md` — executive summary, category-grouped current situation, changelog table
- **Customer status map:** `domain/customer-deliverable-statuses.json` collapses eight internal statuses into five customer buckets
- **Publish:** After onboarding, use **Publish situation report** on the pinned index; prior snapshot rotates into the changelog with generation date preserved
- **Status updates:** Use `update_deliverable_status` for app-initiated status changes; declarative `field_change` in `deliverables.json` dispatches `on_validation_required` when status becomes Validation required
- **Delivery excerpt:** Sourced from linked Delivery Template Canvas `## Customer summary` when reviewed; fallback copy when pending

## Canvas rules

- Files use `.hbs.md` suffix
- Do **not** embed `<!-- tes-event-context -->` in author templates (injected by renderer)

## Validation

Compilers validate against the capability catalog at load time. Run tests:

```bash
cd slack-app && deno task test
```

Reference: [Slack Block Kit](https://docs.slack.dev/reference/block-kit), [Slack Lists API](https://docs.slack.dev/reference/methods/slackLists.create)
