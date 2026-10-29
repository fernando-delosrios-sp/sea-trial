## ADDED Requirements

### Requirement: Verification agent trigger on validation or acceptance

The system SHALL trigger the Verification Agent workflow when a Deliverables List row status first transitions to **Validation required** or **Accepted**. The workflow SHALL prompt the assigned Tech Specialist in the deliverable thread to provide visual proof links, configuration notes, and an outcome summary. The system SHALL NOT create an independent Slack canvas for the deliverable.

#### Scenario: Prompt triggered on validation required

- **GIVEN** a Deliverables List row with status **In progress**
- **WHEN** the row status changes to **Validation required**
- **THEN** the Verification Agent SHALL initiate a thread conversation prompting for visual proof and outcome summary
- **AND** no new Slack canvas SHALL be created in the workspace

#### Scenario: No separate canvas created on accept

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** the Deliverables List row is created or accepted
- **THEN** no standalone Delivery Template Canvas SHALL exist or be provisioned for that row

### Requirement: Delivery proof synchronization to requirements canvas

Upon receiving verified proof from the Tech Specialist, the Verification Agent SHALL format and write a `### Delivery Proof & Outcome` block directly into the parent requirement section in the Requirements Canvas matching `requirement_ref`.

#### Scenario: Proof written to parent requirement

- **GIVEN** a deliverable with `requirement_ref: REQ-01`
- **WHEN** the Verification Agent receives visual proof and config notes
- **THEN** the Requirements Canvas SHALL be updated with a `### Delivery Proof & Outcome` subsection under `## REQ-01`
- **AND** the requirement status in the canvas SHALL be updated to `Complete`

---

## MODIFIED Requirements

### Requirement: Deliverable list schema

Deliverables List rows SHALL use the mandatory core fields. The list column schema SHALL be defined in `slack-app/content/lists/deliverables.json` with stable column `key` values. Status select options SHALL reference `@domain/deliverable-statuses`. The schema SHALL include a **Requirement Ref** column (`requirement_ref`) linking to the parent `REQ-XX` identifier in the Requirements Canvas, and an **Open questions** column used as a source field for Situation Report publishing.

#### Scenario: Core fields populated

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** the list row is created
- **THEN** Task ID, Requirement Ref, Assignee, Status, Situation, Category, Requirements, Due date, Deliverable, and Open questions fields SHALL be populated per schema

---

## REMOVED Requirements

### Requirement: On-demand delivery template canvas

**Reason**: Per-task delivery canvases caused severe Slack canvas sprawl; proof is now consolidated directly into the Requirements Canvas.

**Migration**: Existing delivery canvases remain as archives with banner warnings; active flows sync proof into `REQ-XX` blocks in the Requirements Canvas.

### Requirement: Delivery canvas title disambiguation

**Reason**: Standalone delivery canvases are no longer provisioned on-demand.

**Migration**: Canvas titles are no longer dynamically generated for individual deliverables.

### Requirement: Delivery canvas review flag

**Reason**: Standalone delivery canvas drafts and review banners are eliminated in favor of direct Requirements Canvas ledger updates.

**Migration**: Proof blocks are formatted and verified via the Verification Agent before appending to the Requirements Canvas.
