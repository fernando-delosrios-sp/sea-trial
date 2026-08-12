## Context

TES Event Channels track accepted deliverables in a Deliverables List. Each row represents a use case to execute and validate. When work reaches **Validation required**, TES needs a structured **Delivery Template Canvas** documenting what was built — artefacts, proof, components, and customer-facing narrative — with an agent-assisted draft/refine loop and explicit human review before content surfaces in the **Situation Report**.

Brainstorming locked: canvas created on Validation required (not Accept); universal template; agent drafts and re-writes standard sections on consolidation; human edits are source material; Customer summary is the sole Situation Report excerpt source; review flag cleared manually.

Current implementation creates a stub canvas on Accept (`buildDeliveryTemplateContent`). Situation Report uses `DELIVERY_EXCERPT_PLACEHOLDER`. This change replaces both.

## Goals / Non-Goals

**Goals:**
- Define canonical Delivery Template Canvas section structure (customer vs internal)
- Defer canvas creation until Validation required; auto-trigger first agent draft
- Implement delivery agent consolidation (auto + manual via canvas action)
- Extract Situation Report delivery excerpt from `## Customer summary`
- Enforce review flag semantics (banner + section markers; manual clearance)

**Non-Goals:**
- Category-specific template variants
- Agent file uploads or secret handling (Infrastructure canvas owns secrets)
- Automated Situation Report publish on canvas changes
- Video/image analysis (agent organizes existing media only)
- Changing internal Deliverables List status vocabulary

## Decisions

### D1: Universal Handlebars canvas template

**Choice:** Single `delivery.hbs.md` with fixed H2 sections: Business value, Visual proof, SailPoint components, External technologies, Customer summary (customer-facing); Artefacts, Configuration (internal); Notes (freeform). Metadata block at top with Author, Category, Draft version, timestamp, review flag, and action links.

**Reason:** One-size-fits-all per user decision; aligns with existing canvas pattern; enables excerpt targeting via stable heading.

**Considered alternatives:** Per-category templates (rejected — categories are free-text); fully free-form agent markdown (rejected — excerpt extraction needs stable sections).

### D2: Deferred canvas creation on Validation required

**Choice:** Deliverables List row created on Accept without Deliverable link. When status transitions to **Validation required**, slack-app creates canvas, links row, invokes delivery agent for draft v1.

**Reason:** Canvas documents validated delivery work, not proposal acceptance.

**Considered alternatives:** Create empty canvas on Accept (rejected — Q8 B); create on Complete only (rejected — too late for review cycle).

### D3: Consolidation merge — full section rewrite

**Choice:** On each agent run, re-write all standard sections from list row + current canvas content. Human prose is input material and may be rephrased. Do not overwrite manually edited **Author** field.

**Reason:** User chose Q12 B; simplifies agent logic vs diff/merge.

**Considered alternatives:** Protect human-edited sections (rejected — Q12 B); diff proposal in thread (rejected — canvas is source of truth).

### D4: Review flag — banner + section markers

**Choice:** After every agent run, set canvas-level `⚠️ Agent draft — pending review` banner and per-section `_Agent-generated — review before sharing_` on touched sections. **Mark reviewed** canvas action clears banner and all section markers. Flag reappears on next consolidation.

**Reason:** User chose Q11 C + Q16 manual clearance.

**Considered alternatives:** Auto-clear on any edit (rejected); clear on Accepted status (rejected).

### D5: Canvas actions for consolidate and mark reviewed

**Choice:** Metadata block includes `[Consolidate draft]` and `[Mark reviewed]` action links invoking slack-app workflows. Consolidate available when canvas exists; first auto-run does not require button press.

**Reason:** User chose canvas button UX (Q15, Q22).

**Considered alternatives:** @mention agent (rejected for primary UX); list-row button only (rejected — user chose canvas button).

### D6: Author snapshot at first draft

**Choice:** Set **Author** from list Assignee at first agent run. Manually editable thereafter; no automated sync when Assignee changes.

**Reason:** User Q13.

### D7: Situation Report excerpt rules

**Choice:** Publish reads linked delivery canvas `## Customer summary` section. Apply 500-character soft cap. Append one hero link from Visual proof if present. Fallbacks: canvas missing → `_Pending delivery canvas structure_`; review flag set → `_Delivery draft pending review_`.

**Reason:** User Q10 A + Q20; replaces MVP placeholder requirement.

**Considered alternatives:** Embed full customer-facing bundle (rejected — too long).

### D8: Per-section agent contract

**Choice:** Agent reads list row (task_id, category, requirements, open_questions, situation, assignee), onboarding suite/components, and current canvas markdown. Produces:

| Section | Output rules |
|---------|-------------|
| Business value | 2–4 sentences; customer-safe |
| Visual proof | Organize existing media/links only; never invent URLs; gap note if empty |
| Artefacts | Table: Name, Type, Location, Version; propose from requirements |
| SailPoint components | Bulleted list with one-line roles; dedupe suite mapping |
| External technologies | Bulleted list; customer-safe names |
| Configuration | Instructions + non-secret checklist; reference Infrastructure for secrets |
| Customer summary | 3–5 sentence digest; note missing visual proof if applicable |

Notes section: read-only unless explicitly instructed.

**Reason:** User Q19; enables testable agent output validation.

### D9: Draft version metadata

**Choice:** Increment integer **Draft version** on each agent consolidation; include ISO timestamp.

**Reason:** Audit trail for review cycles (Q17).

## Risks / Trade-offs

- [Risk] Breaking Accept smoke test (no immediate canvas link) → Mitigation: update smoke-test checklist and tests; document new workflow
- [Risk] Agent rephrase loses human nuance on consolidation → Mitigation: accepted trade-off per Q12 B; humans review before Mark reviewed
- [Risk] Slack canvas action links limited → Mitigation: use workflow deep links or pinned-index fallback if canvas links insufficient
- [Risk] Unreviewed content in Situation Report → Mitigation: excerpt fallback when review flag set
- [Trade-off] Requirements not duplicated on canvas → Accepted; list row remains source for requirements text

## Migration Plan

1. Add `delivery.hbs.md` template and renderer
2. Implement delivery agent endpoint in agent-service
3. Remove on-Accept canvas creation; add Validation-required status listener
4. Add canvas action handlers (Consolidate, Mark reviewed)
5. Update Situation Report excerpt extraction
6. Update ubiquitous-language terms
7. Run `cd slack-app && deno task test` and `cd agent-service && npm test`

Rollback: restore on-Accept stub canvas creation; revert excerpt to placeholder constant.

## Open Questions

1. **Canvas action mechanism:** Slack Canvas native action support vs workflow URL in metadata — resolve during apply spike.
2. **Existing accepted deliverables:** Rows with canvas links from old flow — leave as-is or migration script (defer unless blocking).
