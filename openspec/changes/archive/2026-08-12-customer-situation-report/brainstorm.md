# Brainstorm: customer-situation-report

## Context

TES Event Channels track delivery work in an internal **Deliverables List** (`deliverables.json`) with fields including Task ID, Assignee, Status, Situation, Category, Requirements, Due date, Deliverable (canvas link), and Open questions. Customers need a readable **situation report** derived from that list — not the raw list view. Content transfer from list → canvas will be performed by an AI agent; this change defines the **canvas template structure**, status vocabulary for customers, and publish mechanics.

Existing canvases use Handlebars markdown (`*.hbs.md`) with section-based layouts (Dashboard, Requirements, Infrastructure). Per-deliverable **Delivery Template Canvases** exist on accept but their structure is not yet finalized; embedding delivery excerpts into the situation report is **deferred**.

## Decision chain

**Q1: What is the unit of the report?**
→ **B — Periodic snapshot.** Each publish captures list state at a point in time; not a living per-row canvas and not one canvas per deliverable.

**Q2: How should history live in the canvas?**
→ **C — Current + changelog.** One "Current situation" section at the top; compact changelog table below (date, summary, delta highlights).

**Q3: How should the "Current situation" body organize deliverables?**
→ **C — Executive summary first, then detail.** Short narrative rollup + counts at top; category-grouped detail appendix below.

**Q4: Which list fields appear in the customer-facing report?**
→ **Custom:** `task_id`, customer-facing status, `situation`, `deliverable` (link), `open_questions`. Category used for grouping only (section headings), not as a per-row field. Assignee, Requirements, Due date hidden from customer view.

**Q5: Delivery canvas embed scope?**
→ **Deferred** until delivery canvas structure is defined. Template SHALL include a reserved placeholder subsection per deliverable (e.g. `### Delivery excerpt`) without requiring content at MVP.

**Q6: Internal → customer status mapping?**
→ **B — Collapsed buckets.** Map eight internal statuses to ~4 customer buckets plus Out of scope:
- **In progress:** Not started, In progress
- **Needs your input:** Blocked, Needs clarification
- **In review:** Validation required
- **Complete:** Accepted
- **Out of scope:** Not needed, Not doable

**Q7: What triggers a new snapshot?**
→ **B — Manual/on-demand.** SE (or agent on SE instruction) publishes when ready; no fixed schedule. Report MUST include **generation date**.

## Design trade-offs

| Approach | Pros | Cons |
|---|---|---|
| **1. Single skeleton template + domain status map (chosen)** | Consistent customer reports; status labels centralized in domain JSON; template validates at load | Agent must respect section boundaries on publish |
| 2. Fully agent-authored markdown | Maximum flexibility | Changelog shape drifts; inconsistent customer experience |
| 3. Split partial templates composed by code | Strongest structural guarantee | Heavier plumbing for agent-driven content |

**Chosen:** Approach 1 — `situation-report.hbs.md` skeleton, `@domain/customer-deliverable-statuses` mapping file, agent fills narrative slots inside fixed sections.

## Target template shape (agreed)

```markdown
# Situation Report — {{projectName}}

**Generated:** {{generatedAt}}
**Account:** {{accountDisplay}}

## Executive summary
{narrative + metric counts by customer bucket + blockers rollup + open questions rollup}

## Current situation
### {Category}
#### {taskId} — {customerStatus}
- Situation, Deliverable link, Open questions
- Delivery excerpt: _Reserved — pending delivery canvas structure_

## Changelog
| Date | Summary | Highlights |
```

**Publish behavior:** On manual publish, current content collapses into a new changelog row; fresh content replaces Current situation; Generated date updates.

## Out of scope (this change)

- Automated scheduled publishing
- Delivery canvas excerpt extraction (blocked on delivery canvas design)
- Agent implementation for list → canvas transfer (separate agent/workflow change)
- Incidents list inclusion in situation report
- External export (PDF/email)

## Dependencies

- Requires declarative content layer (`slack-ui-content`) and channel composition (`channel-composition`).
- Unblocks future Requirements Agent or dedicated Situation Report Agent publish workflow.
