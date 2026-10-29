## Context

The Sea Trial platform coordinates Technical Evaluation & Strategy (TES) delivery entirely inside Slack. The `slack-app` (Deno Slack SDK) acts purely as an adapter to Slack primitives (channels, modals, canvases, lists, files, Block Kit interactions). The `agent-service` (Node.js + LangGraph.js) performs all document parsing, LLM-driven semantic reasoning, and TES domain rule enforcement, communicating over typed HTTP contracts defined in `packages/shared`.

Currently, document parsing in `agent-service` is strictly text-based (`pdf-parse`, `mammoth`, `xlsx`), rejecting image-only PDFs and failing to extract visual architecture diagrams or scanned customer specifications. Furthermore, requirements canvas updates are applied immediately upon agent execution without an explicit human review gate, and extracted requirements lack source document provenance, making partial updates and file replacements brittle under Sea Trial's strict "Slack-native state only, no external DB" constraint.

## Architecture

```
+-------------------------------------------------------------------------------+
|                       Deno Slack SDK App (slack-app/)                         |
|                                                                               |
|  [Materials Drop / @mention]                                                  |
|         |                                                                     |
|         v                                                                     |
|  [File Download] ----------------------------+                                |
|         |                                    |                                |
|         v                                    v                                |
|  [POST /agents/requirements/process]   [Post Proposal Block Kit]              |
|         ^                                    |                                |
|         |                                    v                                |
|         |                              [User Clicks:                          |
|         |                               Accept & Update Canvas]               |
|         |                                    |                                |
|         |                                    v                                |
|         |                              [Slack Canvas API:                     |
|         |                               Edit Requirements Canvas]             |
+---------|------------------------------------|--------------------------------+
          | (HTTP Request / Response)          |
          v                                    |
+----------------------------------------------v--------------------------------+
|                   Node.js Reasoning Engine (agent-service/)                   |
|                                                                               |
|  [parseDocuments Node]                                                        |
|    - Extract plain text (where available)                                     |
|    - Render document pages / embedded images to image buffers                 |
|         |                                                                     |
|         v                                                                     |
|  [analyzeRequirements Node (Multimodal Vision LLM)]                           |
|    - Jointly analyze text + image buffers with TesEventContext                |
|    - Tag each synthesized requirement with [filename.ext] source provenance   |
|    - Compare with existing canvas markdown to identify superseded items       |
|         |                                                                     |
|         v                                                                     |
|  [formatOutput Node]                                                          |
|    - Return proposed canvas markdown + proposal summary for Slack thread      |
+-------------------------------------------------------------------------------+
```

## Goals / Non-Goals

**Goals:**
- Extract text, tables, and visual diagram/workflow semantics from uploaded specifications (PDF, DOCX, XLSX, TXT, images) using a multimodal vision LLM pipeline.
- Implement an explicit staged review gate in the Slack invocation thread (`[Accept & Update Canvas]`) before mutating the Requirements Canvas.
- Tag each synthesized requirement in canvas markdown with source document provenance (`[filename.ext]`) to support deterministic reconciliation during revisions.
- Preserve Canvas-as-Truth state management with zero external database dependencies.
- Enable multi-turn iterative refinement in the invocation thread via `@Sea Trial requirements` mentions.

**Non-Goals:**
- Introducing an external database, vector store (Qdrant, Pinecone), or object store (S3) for MVP.
- Deploying a dedicated Python document microservice (e.g. Docling/Unstructured) — execution stays inside Node.js.
- Direct interception of Slack Canvas inline comments (blocked by Slack API limitations).
- Automatic generation of Deliverables List rows during requirements extraction (two-stage workflow: Deliverables are generated only when the user triggers `[🚀 Plan Deliverables]`).

## Decisions

### D1: Multimodal Vision LLM Pipeline in Node.js
- **Choice**: Render document pages and visual diagrams to image buffers in Node.js (via `pdf-img-convert` / `mupdf` or native image decoding) and transmit image payloads alongside text prompts to the configured multimodal LLM.
- **Reason**: Avoids introducing Python runtime dependencies or deploying a secondary microservice on Render, keeping `agent-service` homogeneous in TypeScript while unlocking visual understanding of diagrams and scanned text.
- **Considered alternatives**:
  - *Dedicated Python parser service (Docling / Unstructured)*: Rejected due to hosting overhead on Render free tier and multi-language stack complexity.
  - *Cloud Document AI API (AWS Textract / Google Doc AI)*: Rejected to avoid vendor lock-in and extra cloud credentials for MVP.

### D2: Canvas-as-Truth & Source Provenance Tagging
- **Choice**: Persist requirements state solely within the Requirements Canvas markdown. Each requirement bullet or block is prefixed with its source document name (`[spec-v1.pdf]`).
- **Reason**: Strictly adheres to the global constraint ("Slack-native state only, no external DB"). Source provenance tags allow the LLM to deterministically identify and supersede requirements when a revised document (e.g., `spec-v2.pdf`) is processed.
- **Considered alternatives**:
  - *Hidden JSON manifest inside Canvas markdown*: Rejected because human manual edits in Slack Canvas could corrupt hidden JSON markup.
  - *Append-only without tagging*: Rejected because superseded requirements accumulate as dead clutter.

### D3: Staged Review Gate in Slack Thread
- **Choice**: The agent posts a summary of proposed requirements with an `[Accept & Update Canvas]` button in the Slack invocation thread. The Requirements Canvas is only modified once the user clicks Accept.
- **Reason**: Aligns with Sea Trial's agent write gate rules; prevents destructive or unintended canvas overwrites without human consent.
- **Considered alternatives**:
  - *Immediate Canvas Overwrite*: Rejected because users lost draft control and could not inspect proposed changes before canvas mutation.

### D4: Two-Stage Deliverables Handoff
- **Choice**: Requirements extraction focuses strictly on updating the Requirements Canvas. Scoping of concrete Deliverables List items remains gated behind the user-initiated `[🚀 Plan Deliverables]` action link on the canvas header.
- **Reason**: Separates requirements discovery from contract deliverable commitments. Avoids overwhelming the user with simultaneous canvas updates and deliverable list proposals.
- **Considered alternatives**:
  - *Combined single run*: Rejected as it violates user cognitive boundaries and creates premature list items before requirements are agreed upon.

## Risks / Trade-offs

- [Risk] Document processing timeouts on large PDF/image payloads -> Mitigation: Enforce file size and page limit guards (e.g., max 15 pages per document in MVP) and return actionable user feedback if payload exceeds processing thresholds.
- [Risk] Slack API limitations on dev tenant (Canvas edit concurrency or rate limits) -> Mitigation: `slack-app` performs atomic full-markdown replacement using `canvases.edit` and verifies section marker integrity.
- [Risk] Canvas comment interactions unsupported by Slack API -> Mitigation: Clearly document that section refinement must be requested via thread replies or `@Sea Trial requirements` mentions in the channel.
- [Trade-off] Transmitting base64-encoded image buffers in HTTP request between Deno and Node -> Reason for acceptance: Eliminates external S3/blob dependencies and keeps deployment entirely within Slack and Render HTTP boundaries.

## Migration Plan

1. Update `@sea-trial/shared` types with `ImagePayload` and multimodal `ParsedDocument` fields.
2. Implement page rendering in `agent-service/src/parsers/` and update `parseDocuments` and `analyzeRequirements` graph nodes.
3. Update `slack-app` invocation handler and Block Kit builder to render `[Accept & Update Canvas]` gate.
4. Acceptance criteria:
   - Passing automated tests in `npm test` (`agent-service`) and `deno task test` (`slack-app`).
   - Image-based PDF and architecture diagrams extract structured requirements.
   - Requirements Canvas updates only upon user clicking Accept in Slack thread.

## Open Questions

- *None* — all architectural questions resolved.

