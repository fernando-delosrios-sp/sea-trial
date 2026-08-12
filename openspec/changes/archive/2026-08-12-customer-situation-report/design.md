## Context

TES Event Channels use a Deliverables List as the internal system of record for delivery items. Customers in the shared channel need periodic **situation reports** — readable snapshots with executive summary, detail grouped by category, and a compact changelog — without exposing assignees, raw internal statuses, or full requirements text.

Brainstorming locked: manual/on-demand publish; current + changelog layout; executive summary then category detail; customer fields (`task_id`, mapped status, `situation`, `deliverable`, `open_questions`); collapsed status buckets via domain JSON; generation date required; delivery excerpt placeholder deferred.

The declarative content layer (`slack-ui-content`) and channel composition (`channel-composition`) already provision canvases from `*.hbs.md` templates. This change adds a new seeded canvas and a publish path that transforms list rows into customer-facing markdown inside the fixed template.

## Goals / Non-Goals

**Goals:**
- Author `situation-report.hbs.md` with stable section headings agents and code can target
- Define `customer-deliverable-statuses.json` mapping all eight internal statuses to five customer buckets
- Seed Situation Report canvas per TES event channel via composition manifest
- Implement manual publish: rotate current → changelog, write new current from list, set generation date
- Expose customer field projection rules (include/exclude list columns)
- Test template render, status mapping, and changelog rotation

**Non-Goals:**
- AI agent implementation for narrative executive summary (agent consumes template contract later)
- Delivery canvas excerpt extraction (placeholder only until delivery canvas structure exists)
- Scheduled/automatic publishing on list field changes
- Incidents list in situation report
- External export (PDF, email)

## Decisions

### D1: Single skeleton template (Handlebars MD)

**Choice:** One `situation-report.hbs.md` with fixed H1/H2/H3 structure; publish code or agent replaces body content within marked sections while preserving changelog table schema.

**Reason:** Consistent customer experience; aligns with existing canvas pattern (`dashboard.hbs.md`).

**Considered alternatives:** Fully free-form agent markdown (rejected — changelog drift); split partials composed in code (rejected — unnecessary complexity for MVP).

### D2: Customer status buckets in domain JSON

**Choice:** New `customer-deliverable-statuses.json` with entries `{ internal, customer_bucket, label }` registered as `@domain/customer-deliverable-statuses`. Publish logic maps list Status column through this file.

**Reason:** Editorial control over customer language; no change to internal list status vocabulary.

**Mapping (locked in brainstorm):**

| Internal | Customer bucket |
|---|---|
| Not started, In progress | In progress |
| Blocked, Needs clarification | Needs your input |
| Validation required | In review |
| Accepted | Complete |
| Not needed, Not doable | Out of scope |

### D3: Current + changelog document model

**Choice:** Canvas holds one **Current situation** block and a **Changelog** markdown table. On publish, prior current content compresses to one changelog row (date = previous generation date, summary + highlights); new current replaces from live list.

**Reason:** User chose snapshot history without separate canvas files per date.

### D4: Category as grouping key only

**Choice:** Detail appendix groups items under `### {category}` headings sourced from list `category` column; category is not repeated as a bullet in each item block.

**Reason:** Matches executive-summary-first layout; reduces redundancy.

### D5: Manual publish entry point

**Choice:** Slack shortcut or pinned-index button "Publish situation report" invoking a workflow/function that reads Deliverables List via existing list API helpers, maps fields, updates canvas.

**Reason:** User chose on-demand publish; avoids noisy auto-updates on every list edit.

### D6: Delivery excerpt placeholder

**Choice:** Each item block includes `**Delivery excerpt:** _Pending delivery canvas structure_` (or empty subsection). No read of Delivery Template Canvas at MVP.

**Reason:** Delivery canvas structure undefined; avoids blocking situation report on delivery canvas design.

### D7: TesEventContext slot

**Choice:** Add `situationReportCanvasId` to `TesEventContext` and `runtime.context_slot_map.situation_report` in `tes-event.json`.

**Reason:** Consistent with other provisioned objects; enables publish workflow to resolve canvas ID.

## Risks / Trade-offs

- [Risk] Agent-generated executive summary inconsistent with list data → Mitigation: template documents required metrics table derived from mapped statuses; code can compute counts deterministically
- [Risk] Changelog table grows unbounded → Mitigation: document soft limit (e.g. 52 rows) in ops guidance; future trim policy out of scope
- [Risk] Publish without onboarding complete shows empty report → Mitigation: gate publish on `onboardingComplete` or allow with empty-state copy in template
- [Trade-off] Narrative summary quality depends on agent/human → Accepted; structure is the deliverable of this change

## Migration Plan

1. Add domain JSON and register ref in capability catalog
2. Add canvas template and renderer function
3. Extend `tes-event.json` composition + `TesEventContext`
4. Implement publish function/workflow
5. Seed empty situation report on new channel create; existing channels require manual canvas create or re-seed script (document as limitation)
6. Run `cd slack-app && deno task test`

Rollback: remove slot from composition; omit publish trigger; existing canvases harmless if left in workspace.

## Open Questions

1. **Publish trigger UX:** Global shortcut vs pinned-index button vs slash command — recommend pinned-index button alongside Deliverables link (resolve in apply).
2. **Existing channels:** Backfill `situationReportCanvasId` for channels created before this change — manual or migration workflow (defer unless required for MVP smoke).
3. **Delivery excerpt:** Revisit when Delivery Template Canvas structure is defined; likely tagged section `## Customer summary` in delivery canvas.
