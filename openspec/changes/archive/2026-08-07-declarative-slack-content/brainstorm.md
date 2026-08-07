# Brainstorm: declarative-slack-content

## Context

After domain JSON (`domain-content-json`), UI content remains scattered: modals inline in functions and `lib/`, canvas strings in `templates/index.ts`, list schemas in `lists.ts`, Block Kit in TypeScript builders. Exploration agreed: modals and lists in JSON, canvases in Handlebars MD, pinned index in Handlebars JSON, `@domain/*` refs for select options.

Slack channel templates rejected — implement via repo content + API provisioner (composition is a separate change).

## Decision chain

**Q1: Templating for dynamic canvases/messages?**
→ Handlebars (`{{var}}`, `{{#if}}`, partials). Metadata block (`<!-- tes-event-context -->`) injected by code, not in editorial templates.

**Q2: Modal format?**
→ Block Kit JSON + `dynamic` overlay for prefill/options (`account_name`, `sailpoint_suite` from domain JSON).

**Q3: List definition structure?**
→ JSON with `columns` (incl. `@domain/deliverable-statuses`), empty `seed.items`, and `behavior.field_change[]` as declarative intent (Phase 1: dispatch on app-initiated writes only; Slack has no list change Events API yet).

**Q4: What stays in code?**
→ Submit handlers, validation, gates, agent logic, API wrappers (`canvas.ts`, `lists.ts` become load + call only).

**Q5: Scope boundary vs channel-composition-engine?**
→ This change externalizes content files and compilers. `seed_channel_objects` may call new loaders directly; full composition manifest and kind registry deferred to change 3.

## Design trade-offs

| Approach | Pros | Cons |
|---|---|---|
| Migrate all content in one PR | Complete separation | Large diff |
| Incremental: static canvases first | Easier review | Two migration passes |

**Chosen:** Single change covering modals, lists, canvases, messages + loader infrastructure; seed function updated to use loaders but not yet composition-driven.

## Target layout

```
slack-app/content/
  modals/create-tes-event.json, onboarding.json
  lists/deliverables.json, incidents.json
  canvases/*.hbs.md
  messages/pinned-index.hbs.json
slack-app/lib/content/
  loader.ts, modal-compiler.ts, canvas-renderer.ts, list-compiler.ts
```

## Out of scope (this change)

- `content/channels/tes-event.json` composition manifest
- Kind registry and four-plane model (resources/chrome/automation/organization)
- `TesEventContext.slots` refactor
- List behavior Phase 2/3 (poll / Events API)

## Dependency

Requires `domain-content-json` merged. Unblocks `channel-composition-engine`.
