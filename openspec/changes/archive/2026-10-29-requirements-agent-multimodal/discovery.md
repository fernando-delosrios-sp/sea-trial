## Scope

In: Multimodal document extraction (text, tables, and images/diagrams via a multimodal vision LLM pipeline in Node agent-service), source-tagged Canvas-as-Truth state management, staged in-thread requirement proposals requiring user acceptance before updating the Requirements Canvas, thread-based multi-turn tweaks, and clean two-step handoff to Plan Deliverables.
Out: External databases/vector stores, dedicated Python parser microservices, automatic unapproved canvas overwrites, and Slack Canvas inline comment event hooks (blocked by Slack API limitations).

## Language

**Multimodal Document Pipeline** (`promote`):
A parsing and extraction flow in `agent-service` that renders document pages and visual figures into image buffers and passes them alongside text to a multimodal vision LLM to extract requirements, tables, and architecture diagrams.
_Avoid_: OCR-only engine, text-only parser, external document microservice.

**Source Provenance Tag** (`promote`):
An explicit document origin identifier (e.g., `[PRD-v1.pdf]`) prefixed to each synthesized requirement in the Requirements Canvas markdown, enabling deterministic replacement or retraction when a source document is updated or discarded.
_Avoid_: hidden vector chunk ID, citation footnote.

**Requirements Proposal Gate** (`promote`):
A Block Kit review interaction in the Slack invocation thread where the agent presents a summarized diff of candidate requirements and awaits explicit user acceptance (`[Accept & Update Canvas]`) before modifying the Requirements Canvas.
_Avoid_: direct unreviewed canvas overwrite, auto-commit.

## Decisions

- **Context**: The existing MVP requirements parser only extracted selectable text from text PDFs, DOCX, XLSX, and TXT, rejecting image-only PDFs and ignoring embedded diagrams. Users also needed to understand how partial updates, reviews, and processed data persistence should work without violating the Slack-native state constraint.
- **Q1: Text and Image Extraction Architecture**: How should agent-service extract text and visual diagrams from heterogeneous documents?
  - *Options*: Multimodal Vision LLM pipeline in Node vs Dedicated Python parser service (Docling/Unstructured) vs Cloud Document AI API.
  - *Chosen*: Multimodal Vision LLM pipeline. Renders pages and embedded figures to image buffers and feeds them to the configured multimodal LLM. Avoids introducing Python runtime or external cloud infrastructure dependencies.
- **Q2: State Persistence & Processed Data**: Where should intermediate processed data and revision history live for partial updates?
  - *Options*: Stateless Canvas-as-Truth vs Slack-native hidden metadata vs External database / S3 store.
  - *Chosen*: Stateless Canvas-as-Truth. Preserves global constraint ("Slack-native state only, no external DB"). The agent re-reads the full Requirements Canvas markdown on every invocation.
- **Q3: Document Discard & Update Tracking**: How does the agent reconcile superseded or retracted documents under Canvas-as-Truth?
  - *Options*: Source provenance tags on canvas requirements vs Machine-readable JSON manifest vs Append-only manual cleanup.
  - *Chosen*: Source provenance tags (`[filename.ext]`) on requirement items in canvas markdown. Human-readable and allows deterministic matching/superseding when documents are updated or deleted.
- **Q4: Requirement Review & Approval Lifecycle**: How should users review and approve extracted requirements?
  - *Options*: Staged thread review before canvas write vs Immediate canvas sync with thread deliverable gates vs Section-level status tags in canvas.
  - *Chosen*: Staged thread review. The agent summarizes proposed requirements in the Slack thread; user clicks `[Accept & Update Canvas]` to write changes. Subsequent tweaks are handled by mentioning the agent in the thread.
- **Q5: Requirements vs Deliverables Staging**: Should Requirements Canvas updates and Deliverables List generation be combined or separated?
  - *Options*: Two-step staged workflow vs Combined single run.
  - *Chosen*: Two-step workflow. Users finalize and approve the Requirements Canvas first, then trigger `[🚀 Plan Deliverables]` to generate Deliverables List proposals.

## Open questions

- *None* — all five architectural forks resolved during discovery.

## Scenarios discussed

- **Image-only or diagram-heavy specification**: Uploaded architecture diagram or scanned document is rendered into an image buffer and interpreted semantically by the multimodal vision LLM instead of failing with an unsupported format error.
- **Document replacement / version update**: User uploads `Architecture_v2.pdf` to replace `Architecture_v1.pdf`. The agent identifies prior requirements tagged with `[Architecture_v1.pdf]`, proposes superseding them with the new requirements, and updates the canvas upon user confirmation.
- **Multi-turn refinement in thread**: User replies in thread `@Sea Trial requirements merge item 3 into item 2 and mark as high priority`. Agent re-runs semantic analyzer against current proposal and presents revised summary.
- **Slack Canvas comment limitation**: User leaves an inline comment on a canvas block. Because Slack's public API does not emit webhook events for canvas comments to bot applications, refinement instructions must be sent via thread replies or @mentions in the channel.

