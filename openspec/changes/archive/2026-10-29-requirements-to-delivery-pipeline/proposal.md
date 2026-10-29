# Proposal: Requirements to Delivery Pipeline

## Why

The current architecture envisions creating an on-demand Slack Canvas for every deliverable (`Delivery: TASK-XX`) when work begins or validation is requested. In real-world TES events with dozens of deliverables, this results in severe **canvas sprawl**—flooding the Slack workspace with separate files that clutter search, channel file pickers, and workspace storage limits.

Furthermore, the lifecycle between raw customer materials, structured requirements, committed deliverables, and customer reporting needs explicit, automated hooks so that team members always have a clear line of sight from the customer's initial problem to verified technical proof and situation reports.

## What

1. **Retire Per-Task Delivery Canvases:**
   Eliminate on-demand creation of `Delivery: TASK-XX` canvases. Instead, make the single **Requirements Canvas** (`requirements.hbs.md`) the single living technical ledger for the project.
2. **Delivery Proof Feedback Loop:**
   Introduce the **Verification Agent** (renamed from Delivery Agent to avoid confusion with the Deliverables Agent). When a deliverable row in the Deliverables List transitions to `Validation required` or `Accepted`, the Verification Agent captures visual proof (e.g. Loom links), technical configuration, and a customer summary, appending it directly to the requirement's `### Delivery Proof & Outcome` block in the Requirements Canvas.
3. **Four Lifecycle Hooks:**
   - **Hook 1 (Ingestion):** Pinned Materials Drop thread ➔ Requirements Agent ➔ Requirements Canvas (`REQ-XX`).
   - **Hook 2 (Scoping):** Requirements Canvas `[Plan Deliverables]` link ➔ Deliverables Agent ➔ Deliverables List (`TASK-XX`).
   - **Hook 3 (Verification):** Deliverables List status ➔ Verification Agent ➔ Requirements Canvas proof feedback.
   - **Hook 4 (Reporting):** Deliverables List + Requirements Canvas ➔ Reporting Agent ➔ Situation Report Canvas (`[Refresh Report]`).
4. **Enforce Materials Drop Discipline:**
   Specification documents dropped outside the pinned Materials Drop thread are ignored or prompted for upload to the dedicated thread.

## Capabilities & Delta Specs

- **`specs/deliverables/spec.md`:**
  - Retire `Requirement: On-demand delivery template canvas`, `Requirement: Delivery canvas title disambiguation`, and `Requirement: Delivery canvas review flag`.
  - Add requirement linking deliverable rows back to requirement IDs (`requirement_ref`).
  - Add trigger requirement for Verification Agent on status transition to `Validation required` / `Accepted`.
- **`specs/delivery-agent/spec.md`:**
  - Rename / supersede Delivery Agent with **Verification Agent**.
  - Change target write destination from standalone delivery canvas to the `### Delivery Proof & Outcome` section in the Requirements Canvas.
- **`specs/requirements-agent/spec.md`:**
  - Update Requirements Canvas structure to include `### Delivery Proof & Outcome` and `### Acceptance Criteria` subsections for each `REQ-XX`.
  - Add instruction to redirect/ignore inline document uploads outside the Materials Drop thread.
- **`specs/ubiquitous-language/spec.md`:**
  - Add `Verification Agent`, `Delivery Proof & Outcome`, and clarify `Requirements Canvas` vs `Deliverables List`.

## Impact

- **Slack Canvas File Count:** Drops from ~20+ canvases per channel down to exactly 4 permanent project canvases (Dashboard, Requirements, Infrastructure, Situation Report).
- **User Experience:** Tech Specialists and Lead SEs have one central document to view requirement intent alongside the final demonstration video and configuration.
- **Reporting:** Situation Report automatically pulls verified customer summaries directly from the requirements canvas.

## Out of Scope

- External database storage (all state stays Slack-native).
- Automated video transcoding or hosting (Slack links / URLs used for visual proof).
- Automatic retrospective channel repair for legacy closed channels.
