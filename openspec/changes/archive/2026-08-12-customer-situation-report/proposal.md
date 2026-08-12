## Why

The Deliverables List is an internal working view — assignees, raw status values, and operational fields are not suitable for customer-facing communication. TES teams need a structured **Situation Report** canvas that translates list state into a readable snapshot with executive summary, category-grouped detail, and preserved history. Without a defined template and customer status vocabulary, agent-driven publishing would produce inconsistent documents and expose internal workflow language to customers.

## What Changes

**Situation Report canvas template**
- From: No customer-facing report canvas; only Dashboard, Requirements, Infrastructure, and per-deliverable Delivery Template Canvases
- To: `content/canvases/situation-report.hbs.md` with fixed sections (header + generation date, executive summary, current situation by category, changelog table) and a reserved delivery-excerpt placeholder per item
- Reason: Consistent customer-readable structure for manual/on-demand publishes
- Impact: Non-breaking; new canvas seeded per TES event channel

**Customer-facing status map**
- From: Internal `deliverable-statuses.json` only (eight exact values)
- To: `content/domain/customer-deliverable-statuses.json` mapping internal status → customer bucket (In progress, Needs your input, In review, Complete, Out of scope)
- Reason: Collapse internal workflow into ~4 customer states without changing list schema
- Impact: Non-breaking; new domain ref registered in capability catalog

**Channel composition slot**
- From: `tes-event.json` provisions dashboard, requirements, infrastructure, deliverables list, incidents list
- To: Adds `situation_report` canvas slot, context field, and navigation entry
- Reason: Situation Report is a first-class channel object like other canvases
- Impact: Non-breaking for existing channels; new channels get the canvas at seed

**Publish workflow (manual)**
- From: No publish path from Deliverables List to customer report
- To: SE-triggered publish (shortcut or pinned-index action) reads list rows, maps statuses, renders/updates Situation Report canvas, appends changelog row from prior snapshot
- Reason: On-demand snapshots with preserved history (user decision B + C)
- Impact: New function/workflow; does not auto-publish on list edits

**Deliverables list schema alignment**
- From: Core fields in spec omit `open_questions`
- To: Spec documents `open_questions` as a customer-report source field (already in `deliverables.json`)
- Reason: Open questions are explicit customer-facing report content
- Impact: Non-breaking documentation/spec sync

## Capabilities

### New Capabilities

_(none — extends existing capabilities)_

### Modified Capabilities

- `slack-ui-content`: Situation Report Handlebars canvas template, renderer accessor, and validation
- `domain-reference-data`: Customer deliverable status bucket map domain JSON and `@domain/customer-deliverable-statuses` ref
- `deliverables`: Manual publish workflow from list to Situation Report; changelog rotation; customer field projection rules
- `channel-composition`: `situation_report` slot in `tes-event.json`, context slot map, navigation entry
- `event-channel`: Seed Situation Report canvas on channel create
- `ubiquitous-language`: Terms for Situation Report, customer status buckets, and publish/changelog semantics

## Impact

- **New:** `content/canvases/situation-report.hbs.md`, `content/domain/customer-deliverable-statuses.json`, publish function/workflow, renderer helper, tests
- **Modified:** `content/channels/tes-event.json`, `lib/content/canvas-renderer.ts`, `lib/content/domain.ts`, capability catalog domain refs, `packages/shared` (optional `situationReportCanvasId` on `TesEventContext`), pinned index or shortcut for publish
- **Deferred:** Delivery canvas excerpt population; agent-automated publish; scheduled cadence; incidents in report
- **Tests:** Template render, status mapping parity, publish changelog rotation, composition slot provisioning
