## 1. Domain — customer status map

- [x] 1.1 Add `content/domain/customer-deliverable-statuses.json` with all eight internal → bucket mappings
- [x] 1.2 Add JSON Schema for customer status map under `schemas/content/`
- [x] 1.3 Extend `lib/content/domain.ts` with accessor `mapToCustomerStatus(internalStatus)`
- [x] 1.4 Register `@domain/customer-deliverable-statuses` in capability catalog
- [x] 1.5 Add domain sync test — every `DeliverableStatus` maps to exactly one bucket

## 2. Canvas template and renderer

- [x] 2.1 Add `content/canvases/situation-report.hbs.md` per design section structure
- [x] 2.2 Add `renderSituationReportCanvas()` in `canvas-renderer.ts` with seed view model
- [x] 2.3 Add empty-state copy for pre-first-publish Current situation
- [x] 2.4 Add `situation_report_template_test.ts` — template loads, required sections present

## 3. Channel composition and context

- [x] 3.1 Add `situation_report` resource slot to `content/channels/tes-event.json`
- [x] 3.2 Add `situationReportCanvasId` to `TesEventContext` in `packages/shared`
- [x] 3.3 Wire `runtime.context_slot_map.situation_report` → `situationReportCanvasId`
- [x] 3.4 Add navigation entry "Situation Report" in `tes-event.json`
- [x] 3.5 Update provision tests — seeded context includes `situationReportCanvasId`

## 4. Publish workflow

- [x] 4.1 Add `lib/situation-report.ts` — list row projection, bucket counts, changelog rotation
- [x] 4.2 Add publish function/workflow (read list, map fields, update canvas via Slack API)
- [x] 4.3 Add publish trigger (pinned-index button or shortcut) gated on `onboardingComplete`
- [x] 4.4 Add `situation_report_publish_test.ts` — first publish, changelog append, status mapping, field exclusion

## 5. Spec scenario coverage

- [x] 5.1 Test: Situation report template loads and validates (slack-ui-content)
- [x] 5.2 Test: Customer status map loads — all eight internals mapped (domain-reference-data)
- [x] 5.3 Test: First publish creates current snapshot (deliverables)
- [x] 5.4 Test: Subsequent publish appends changelog row (deliverables)
- [x] 5.5 Test: Blocked → Needs your input mapping on publish (deliverables)
- [x] 5.6 Test: Delivery excerpt placeholder at MVP (deliverables)
- [x] 5.7 Test: Situation report seeded on channel create (event-channel)
- [x] 5.8 Test: Navigation includes Situation Report link (channel-composition)

## 6. Documentation

- [x] 6.1 Update `slack-app/content/README.md` — Situation Report canvas and customer status map
- [x] 6.2 Update `packages/shared` type docs if `situationReportCanvasId` added
- [x] 6.3 Document publish trigger and changelog behavior for SE users (README or pinned index copy)

## 7. Changelog

- [x] 7.1 Create or update changelog entry for customer-situation-report
- [x] 7.2 Confirm entry covers Situation Report canvas, status buckets, and manual publish
