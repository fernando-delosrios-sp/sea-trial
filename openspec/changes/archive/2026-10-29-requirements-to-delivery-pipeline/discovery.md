## Scope

**In:**
- Connect the 4 lifecycle hooks: (1) Materials Drop thread ➔ Requirements Agent ➔ Requirements Canvas; (2) Requirements Canvas ➔ Deliverables Agent ➔ Deliverables List; (3) Deliverables List ➔ Verification Agent ➔ Requirements Canvas proof feedback; (4) Deliverables List + Requirements Canvas ➔ Reporting Agent ➔ Situation Report Canvas.
- Retire standalone per-task `Delivery: TASK-XX` canvases (`delivery.hbs.md` as an independent canvas) to eliminate Slack workspace file sprawl.
- Embed delivery proof, visual demo links, technical config notes, and customer summary snippets directly under their corresponding `REQ-XX` sections in the single Requirements Canvas (`requirements.hbs.md`).
- Define the **Verification Agent** as the specialized agent that prompts the Tech Specialist for proof upon task completion (`Validation required` or `Accepted`) and writes the outcome back into the Requirements Canvas.
- Support canvas-based workflow action links (`[🚀 Plan Deliverables]({{planDeliverablesUrl}})` and `[🔄 Refresh Report]({{refreshReportUrl}})`) using Slack Workflow Link Triggers.
- Enforce the rule that specification files must be uploaded to the pinned `📁 Materials & Requirements Drop` thread, ignoring or redirecting inline files dropped in general chat.

**Out:**
- Re-architecting the Slack Datastore or channel provisioning engine.
- Integrating external vector databases or non-Slack storage.
- Real-time video processing or automated screenshot generation (visual proof remains links provided by humans/external tools).

---

## Language

**Requirements Canvas** (`canonical`):
The single, authoritative living ledger canvas for a TES Event Channel (`requirements.hbs.md`), capturing raw customer needs, acceptance criteria, and completed delivery proof.

**Deliverables List** (`canonical`):
The Slack List tracking committed tasks (`TASK-XX`) with statuses, assignees, situation notes, and open questions.

**Verification Agent** (`promote`):
The agent responsible for validating deliverables, gathering visual proof and technical configuration from the Tech Specialist when a task reaches `Validation required` or `Accepted`, and writing the structured outcome back into the Requirements Canvas.
_Avoid_: Delivery Agent (confusing with Deliverables Agent), QA Bot.

**Delivery Proof & Outcome** (`promote`):
The structured markdown subsection embedded under a `REQ-XX` entry in the Requirements Canvas containing customer summary, visual proof link, components, and configuration artefacts.
_Avoid_: Delivery Canvas, Delivery Template Canvas, per-task canvas.

**Materials Drop Thread** (`canonical`):
The pinned channel thread dedicated to uploading and cataloging all specification documents and raw customer materials.

---

## Decisions

**Q1 — Why eliminate per-task Delivery Canvases?**
Slack treats every canvas as an independent workspace file. Provisioning 15–30 delivery canvases per project clutters search, file browsers, and user permissions. Moving delivery proof into the single Requirements Canvas maintains complete traceability without file sprawl.

**Q2 — What triggers the Deliverables Agent?**
A Slack Workflow Link Trigger embedded in the Requirements Canvas (`[🚀 Plan Deliverables]({{planDeliverablesUrl}})`). Clicking it opens an interaction/thread with the Deliverables Agent to review and commit items to the Deliverables List.

**Q3 — What triggers the Verification Agent?**
A status change in the Deliverables List to `Validation required` or `Accepted`. The agent prompts the Tech Specialist in the task thread for proof, formats the data, and writes the `### Delivery Proof & Outcome` block into the corresponding requirement.

**Q4 — What triggers the Reporting Agent?**
Either an automatic status change in the Deliverables List or an on-demand click on `[🔄 Refresh Report]({{refreshReportUrl}})` in the Situation Report canvas. The Reporting Agent rolls up list metrics and pulls the 2-sentence customer summary from each completed requirement's proof block.

**Q5 — How are multiple deliverables linked to one requirement handled?**
A requirement in the canvas tracks all linked deliverable task IDs (`Deliverables: TASK-01, TASK-02`). Each task appends its delivery notes, and the parent requirement is marked `Complete` only when all linked deliverables reach `Accepted`.

---

## Open questions

1. Should `Validation required` or `Accepted` be the primary trigger for the Verification Agent prompt? (Default: `Validation required` prompts for draft proof; `Accepted` marks the requirement complete).

---

## Scenarios discussed

- User drops PDF into pinned Materials Drop thread ➔ Requirements Agent extracts `REQ-01` and `REQ-02` into Requirements Canvas.
- User drops document in main channel chatter ➔ Bot gently responds instructing user to drop files into the pinned Materials thread.
- User clicks `[Plan Deliverables]` in Requirements Canvas ➔ Deliverables Agent converses with user in thread, then writes `TASK-01` to Deliverables List and marks `REQ-01` as `Committed`.
- Tech Specialist sets `TASK-01` status to `Validation required` ➔ Verification Agent prompts for Loom link and config notes, formats markdown, and writes `### Delivery Proof & Outcome` under `REQ-01` in the Requirements Canvas.
- Reporting Agent runs on `TASK-01` status change ➔ updates Situation Report canvas metrics and embeds the customer summary excerpt.
