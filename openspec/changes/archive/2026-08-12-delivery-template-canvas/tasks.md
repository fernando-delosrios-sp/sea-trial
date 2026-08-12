## 1. Delivery canvas template

- [x] 1.1 Add `content/canvases/delivery.hbs.md` per design section structure
- [x] 1.2 Add `renderDeliveryCanvas()` in `canvas-renderer.ts` with seed view model
- [x] 1.3 Add `delivery_canvas_template_test.ts` — template loads, required sections present, Customer summary heading exact

## 2. Accept flow change

- [x] 2.1 Remove on-Accept canvas creation from `accept_proposals/mod.ts`
- [x] 2.2 Update `processAcceptProposals` / `buildDeliveryTemplateContent` — defer or replace with Validation-required path
- [x] 2.3 Update `deliverables_test.ts` — Accept creates row without Deliverable link
- [x] 2.4 Update smoke-test checklist — canvas created on Validation required, not Accept

## 3. Validation required trigger

- [x] 3.1 Add status-change handler for Deliverables List → Validation required
- [x] 3.2 Create canvas, link Deliverable field, invoke delivery agent on first transition
- [x] 3.3 Add `validation_required_canvas_test.ts` — canvas created and linked; no canvas before transition

## 4. Delivery agent (agent-service)

- [x] 4.1 Add shared types for consolidation request/response in `packages/shared`
- [x] 4.2 Add delivery agent graph in `agent-service/src/agents/delivery/`
- [x] 4.3 Add HTTP POST `/agents/delivery/consolidate` endpoint
- [x] 4.4 Add agent tests — section contract, gap callouts, Author preservation, no secrets in Configuration

## 5. Canvas actions

- [x] 5.1 Add Consolidate draft workflow/function — load row + canvas, call agent, update canvas, set review flag
- [x] 5.2 Add Mark reviewed workflow/function — clear banner and section markers
- [x] 5.3 Wire action links in delivery canvas metadata block
- [x] 5.4 Add tests — review flag set/clear/reappear; draft version increment

## 6. Situation Report excerpt

- [x] 6.1 Add `extractDeliveryExcerpt(canvasMarkdown)` in `situation-report.ts` — read Customer summary, 500 char cap, hero link
- [x] 6.2 Add review-pending and canvas-missing fallbacks
- [x] 6.3 Update `situation_report_publish_test.ts` — excerpt from Customer summary; fallback when review pending
- [x] 6.4 Remove or replace `DELIVERY_EXCERPT_PLACEHOLDER` constant usage

## 7. Spec scenario coverage

- [x] 7.1 Test: Delivery canvas template loads (slack-ui-content)
- [x] 7.2 Test: Canvas not created on accept (deliverables)
- [x] 7.3 Test: Canvas created on Validation required (deliverables)
- [x] 7.4 Test: Review flag set/clear/reappear (deliverables)
- [x] 7.5 Test: Consolidate draft invokes agent (deliverables + delivery-agent)
- [x] 7.6 Test: Delivery excerpt from Customer summary (deliverables)
- [x] 7.7 Test: Agent output contract scenarios (delivery-agent)

## 8. Documentation

- [x] 8.1 Update `slack-app/content/README.md` — Delivery Template Canvas structure and workflow
- [x] 8.2 Update `docs/smoke-test-checklist.md` — Validation required canvas flow
- [x] 8.3 Update agent-service README with delivery consolidate endpoint

## 9. Changelog

- [x] 9.1 Create or update changelog entry for delivery-template-canvas
- [x] 9.2 Confirm entry covers deferred canvas creation, delivery agent, and Situation Report excerpt
