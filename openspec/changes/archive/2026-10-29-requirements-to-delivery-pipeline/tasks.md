# Tasks: Requirements to Delivery Pipeline

## 1. Shared Types (`packages/shared/`)

- [x] 1.1 Add `requirement_ref` field to `DeliverableRow` and `DeliverableProposal` schemas.
- [x] 1.2 Add `VerificationRequest` and `VerificationResponse` payload interfaces to `packages/shared/src/agents.ts`.
- [x] 1.3 Add `DeliveryProofBlock` interface capturing customer summary, visual proof link, components, and configuration artefacts.

## 2. Declarative Content & Templates (`slack-app/content/`)

- [x] 2.1 Update `slack-app/content/canvases/requirements.hbs.md` with the canonical `REQ-XX` structure, `### Acceptance Criteria`, `### Delivery Proof & Outcome`, and the `[🚀 Plan Deliverables]` action link header.
- [x] 2.2 Update `slack-app/content/lists/deliverables.json` to include the `requirement_ref` text column.
- [x] 2.3 Retire or archive `slack-app/content/canvases/delivery.hbs.md` from active channel seeding and canvas creation flows.
- [x] 2.4 Update `slack-app/content/canvases/situation-report.hbs.md` to reference `[🔄 Refresh Report]` workflow link trigger.

## 3. Slack Adapter Orchestration (`slack-app/`)

- [x] 3.1 Update `invoke-agent-handler.ts` to detect file attachments uploaded in general channel chatter outside the pinned Materials Drop thread and reply with redirect guidance.
- [x] 3.2 Add workflow trigger listener for `plan_deliverables` action link from the Requirements Canvas.
- [x] 3.3 Update `on_validation_required` list behavior in `slack-app/` to summon the Verification Agent instead of creating a standalone delivery canvas.
- [x] 3.4 Implement canvas section writer helper to append or update `### Delivery Proof & Outcome` under the targeted `REQ-XX` heading.

## 4. Agent Service Reasoning (`agent-service/`)

- [x] 4.1 Implement `VerificationAgent` graph in `agent-service/src/agents/verification/` to format proof inputs into the canonical markdown block.
- [x] 4.2 Expose POST `/agents/verification/format` endpoint in `agent-service/src/server.ts`.
- [x] 4.3 Update `ReportingAgent` to extract customer summaries and demo links from `REQ-XX` proof blocks when generating the Situation Report.

## 5. Verification & Tests

- [x] 5.1 Run `deno task test` in `slack-app/` to verify list schema loading and message routing tests.
- [x] 5.2 Run `npm test` in `agent-service/` and `packages/shared/` to verify agent formatting and type contracts.

## 6. Documentation & Changelog

- [x] 6.1 Update `openspec/specs/ubiquitous-language/spec.md` with Verification Agent and Delivery Proof terms.
- [x] 6.2 Update `CHANGELOG.md` using the changelog-generator skill.

