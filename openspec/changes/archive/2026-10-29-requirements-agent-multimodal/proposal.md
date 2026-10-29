## Why

The current Requirements Agent only parses selectable text from text PDFs, DOCX, XLSX, and TXT files, failing on image-only documents and missing architecture diagrams crucial for enterprise requirements. Additionally, canvas updates happen automatically without a staged human review gate, and lack document source provenance, making partial updates and file replacements error-prone while adhering to the Slack-native state constraint. Upgrading to a multimodal vision pipeline with staged review gates and source-tagged canvas sync enables rich visual extraction and safe, traceable requirements iteration.

## What Changes

**Document Extraction Pipeline**
- From: Pure text-based parsing (`pdf-parse`, `mammoth`, `xlsx`) that explicitly rejects image-only PDFs and ignores visual diagrams.
- To: Multimodal Vision LLM pipeline that renders document pages and visual figures into image buffers in Node.js and extracts text, structured tables, and architectural diagrams.
- Reason: Customer requirements specifications often include system diagrams, scanned specs, and visual workflow charts.
- Impact: Non-breaking enhancement to `agent-service` extraction; expands accepted input formats and visual fidelity.

**Requirements Canvas Review Gate**
- From: Agent immediately updates the Requirements Canvas upon processing documents.
- To: Agent posts a summarized requirements proposal in the Slack invocation thread with an `[Accept & Update Canvas]` button; the Requirements Canvas is updated only after user acceptance.
- Reason: Enforces human-in-the-loop review before mutating the shared event canvas.
- Impact: Slack interaction flow change; adds an explicit approval gate before canvas write.

**Requirements Provenance & Reconciliation**
- From: Synthesized requirements in canvas markdown lack document source tracking, making partial updates or file retractions difficult to isolate.
- To: Synthesized requirements are prefixed with source provenance tags (`[filename.ext]`), allowing the agent to deterministically replace or prune superseded items when revised documents are uploaded.
- Reason: Enables Canvas-as-Truth state management without introducing external databases.
- Impact: Predictable incremental updates and clear requirement auditability.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `requirements-agent`: Multimodal vision extraction, staged thread proposal review gate, and source provenance tagging in Requirements Canvas synchronization.
- `ubiquitous-language`: Formalize definitions for Multimodal Document Pipeline, Source Provenance Tag, and Requirements Proposal Gate.

## Impact

- `agent-service`: Update document parsing to render pages and visual figures to buffers, adapt LangGraph nodes (`parseDocuments`, `analyzeRequirements`) to support multimodal vision payloads, and enforce source tagging.
- `slack-app`: Update Block Kit proposal rendering to gate canvas writes behind user acceptance in the invocation thread.
- `packages/shared`: Extend `ParsedDocument` and `ProcessRequirementsRequest` / `ProcessRequirementsResponse` types to carry visual payloads and source tags.
- Storage & DB: Unchanged — retains strict Slack-native state only.

