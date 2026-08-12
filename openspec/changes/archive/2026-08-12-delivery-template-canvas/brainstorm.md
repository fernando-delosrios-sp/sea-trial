# Brainstorm: delivery-template-canvas

## Context

Per-deliverable **Delivery Template Canvases** (alias: delivery canvas) capture what was built for each accepted deliverable. Today they are created on Accept with a minimal stub (`Category`, `Requirements`, `Source Reference`, `Requirements Canvas Excerpt`, `Status`) via `buildDeliveryTemplateContent`. The **Situation Report** has a deferred **Delivery excerpt** placeholder per item, blocked until this structure is defined.

Grilling session (2026-08-12) locked scope with the user. Actors: TES (execution), AE/SE (customer channel). Agent drafts and refines canvas content; humans edit freely; explicit review before customer-facing publish.

Existing repo constraints:
- Canvas templates use Handlebars markdown (`*.hbs.md`)
- Deliverables List is system of record; `Validation required` status exists in `deliverable-statuses.json`
- Situation Report excerpt deferred to `## Customer summary` section
- Secrets belong on Infrastructure canvas, not delivery canvas

## Decision chain

**Q1: Primary audience?**
→ **Both.** Internal sections for execution; customer-facing sections embedded into Situation Report.

**Q2: Lifecycle model?**
→ Canvas tied to Deliverables List row. When status → **Validation required**, agent auto-creates canvas + first draft. Draft editable anytime. Manual re-consolidation merges list updates + canvas human additions. Template includes agent-review flag. Author from assignee at draft time.

**Q3: Template shape?**
→ **One size fits all** with option to manually add subsections.

**Q4: Human vs AI ownership?**
→ **No split.** Agent drafts and later refines from list record + current canvas (including human prose). Human edits are source material on re-consolidation.

**Q5: Artefact list?**
→ **Both** links and Slack file references; structured table.

**Q6: Visual proof?**
→ Inline screenshots/recordings + links. Live demo URLs welcome but do not replace proof. **Customer-facing.**

**Q7: Configuration?**
→ Mix of instructions and configuration details. **Internal only.** Secrets on Infrastructure canvas. Connector XML is a referenced artefact, not inline config.

**Q8: Canvas creation timing?**
→ **B — Canvas only created when status first reaches Validation required** (not on Accept). Deliverable link empty until then.

**Q9: Section catalog?**
→ Approved universal template (requirements stay on list row, not duplicated).

**Q10: Situation Report embedding?**
→ **A — `## Customer summary` only** as excerpt source.

**Q11: Review flag?**
→ **C — Canvas banner + per-section markers** after every agent run; cleared manually.

**Q12: Re-consolidation merge?**
→ **B — Agent re-writes all standard sections** from list + canvas as input; human prose may be rephrased.

**Q13: Author metadata?**
→ Snapshot assignee at first draft; manually editable; no automated sync.

**Q14: SailPoint components & external technologies?**
→ **C — Agent proposes; human refines** between consolidations.

**Q15: Manual re-trigger UX?**
→ **Canvas button** (`Consolidate draft`).

**Q16: Review clearance?**
→ Human clears flag manually via **Mark reviewed** (canvas action).

**Q17: Draft version?**
→ Monotonic integer in metadata; incremented per agent run.

**Q18: Sparse first draft?**
→ **C — Best-effort from requirements; gap callouts** where proof/artefacts missing.

**Q19: Per-section AI contract?**
→ Approved (see design.md D8).

**Q20: Situation Report excerpt rules?**
→ 500 char soft cap; one hero proof link if present; fallback placeholders for missing canvas or unreviewed draft.

**Q21: Auto-trigger on status change?**
→ **Yes** — first transition to Validation required creates canvas + draft v1; canvas button for subsequent consolidations.

**Q22: Review clearance UX?**
→ Paired canvas actions: Consolidate draft + Mark reviewed.

**Q23: Template skeleton?**
→ Approved (see design.md D1).

## Agreed template shape

```markdown
# Delivery: {{taskId}}

> ⚠️ **Agent draft — pending review** · Draft v{{draftVersion}} · {{generatedAt}}
> **Author:** {{author}} · **Category:** {{category}}
> **Actions:** [Consolidate draft] · [Mark reviewed]

---

## Business value          ← customer-facing
## Visual proof             ← customer-facing
## SailPoint components     ← customer-facing
## External technologies    ← customer-facing
## Customer summary         ← customer-facing · situation-report-excerpt

---

## Artefacts                  ← internal
## Configuration              ← internal

---

## Notes                      ← freeform
```

## Design trade-offs

| Approach | Pros | Cons |
|---|---|---|
| **1. Universal template + delivery agent (chosen)** | Consistent structure; enables Situation Report excerpt; clear review gate | Breaking change: no canvas on Accept |
| 2. Canvas on Accept + agent fill later | Preserves current link timing | Empty canvases accumulate; conflicts with Q8 |
| 3. Category-specific templates | Tailored sections | Maintenance burden; categories are free-text |

**Chosen:** Approach 1 — deferred canvas creation, delivery agent consolidation, single template.

## Out of scope

- Automated Situation Report publish on canvas update
- Category-specific template variants
- Agent file uploads (links only)
- Secrets in delivery canvas Configuration section
- OCR / video analysis for visual proof

## Dependencies

- Unblocks Situation Report delivery excerpt (replaces MVP placeholder)
- Requires new delivery agent endpoint in agent-service
- Modifies Accept flow (remove on-Accept canvas creation)
- Status-change listener for Validation required transition
