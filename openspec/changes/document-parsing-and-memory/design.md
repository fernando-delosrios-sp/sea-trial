## Context

The TES Event Process MVP (`tes-slack-process-mvp`) defines a hybrid architecture: Deno slack-app (Slack adapter) and Node agent-service (LangGraph reasoning engine). Document parsing behavior is specified in the requirements-agent spec but implementation decisions were explicitly deferred — parser libraries, transport format, and memory tooling.

This change resolves those deferred decisions based on a brainstorming session (2026-08-04). Stakeholders: Sales Engineers (upload docs), TES team (review agent output), implementation team (Tasks 5–6).

Expected document mix for MVP: structured office docs (DOCX, XLSX) plus text-based PDFs — not scanned or layout-heavy documents.

Constraints inherited from parent change: D3a adapter boundary, D4 Slack-native state only, D5 Requirements Canvas as task memory, TypeScript throughout.

## Goals / Non-Goals

**Goals:**

- Lock format-vs-semantic parsing split and component placement
- Confirm MVP memory model (Slack-native only; no external vector store)
- Specify supported formats, library direction, and error handling for unsupported files
- Document phase 2 disposition for candidate tools (markitdown, marker, qdrant, supermemory, gbrain)
- Unblock agent-service parser pipeline implementation (Task 5)

**Non-Goals:**

- External memory layer (qdrant, supermemory, gbrain) — phase 2
- Python parser sidecar (markitdown, marker) — phase 2
- OCR for scanned/image-only PDFs — out of MVP scope per parent change
- Split parsing across slack-app and agent-service
- Changes to review gate, deliverables list, or onboarding flows

## Decisions

### D1: Format parsing in agent-service only

- **Choice:** All format extraction (bytes → plain text) runs in agent-service `parsers/` module. slack-app downloads raw bytes from Slack and sends them in the HTTP request without pre-processing.
- **Reason:** Maintains D3a boundary (slack-app = I/O only); Node has mature parser libraries; single testable pipeline; Deno parser ecosystem is weaker
- **Considered alternatives:** Split parsing in slack-app (rejected — boundary blur, weak Deno libs); Python markitdown sidecar (deferred — ops complexity for MVP doc mix)

### D2: Format vs semantic split at LangGraph node boundary

- **Choice:** `parseDocuments` node performs format extraction (no LLM). `analyzeRequirements` and downstream nodes perform semantic extraction (LLM + TES rules).
- **Reason:** Clear separation of deterministic parsing from probabilistic reasoning; easier testing
- **Considered alternatives:** Single combined node (rejected — harder to test, obscures failure modes)

### D3: Node TypeScript parser libraries for MVP formats

- **Choice:** DOCX via mammoth; XLSX via sheetjs/xlsx; PDF via pdf-parse or pdfjs-dist; plain text pass-through. Exact PDF library chosen at implementation based on fixture quality.
- **Reason:** Matches expected doc mix (structured office docs + text-based PDFs); stays in TypeScript stack; no Python runtime
- **Considered alternatives:** marker for PDF (deferred — ML/OCR overkill); markitdown unified converter (deferred — Python sidecar)

### D4: Slack-native memory confirmed for MVP

- **Choice:** MVP memory = TesEventContext (Dashboard metadata) + Requirements Canvas (task memory) + Deliverables List (accepted outputs) + agent thread (multi-turn). No qdrant, supermemory, or gbrain.
- **Reason:** Each agent invocation receives full canvas markdown and context — no retrieval layer needed. Channel memory is low MVP value; deferred as phase 2 learning exercise.
- **Considered alternatives:** Hybrid Slack + vector store (deferred); learning-first external memory (deferred)

### D5: Graceful unsupported handling for image-only PDFs

- **Choice:** Image-only or encrypted PDFs return `{ supported: false, error: "<human-readable reason>" }` without unhandled exceptions. Agent surfaces the error in canvas "Documents processed" section and may ask for alternative format.
- **Reason:** OCR explicitly out of MVP scope; existing spec requires graceful rejection
- **Considered alternatives:** Attempt OCR via marker (rejected for MVP)

### D6: Raw bytes as base64 in HTTP JSON payload

- **Choice:** `FilePayload[]` with `{ filename, mimeType, contentBase64 }` in POST body. Multipart alternative acceptable at implementation if size limits require it.
- **Reason:** Simplest contract for MVP file volumes; shared types work across Deno and Node
- **Considered alternatives:** Pre-extracted text in payload (rejected — duplicates parsing); multipart-only (acceptable fallback)

## Risks / Trade-offs

- [Risk] pdf-parse fails on complex PDF layouts → Mitigation: return unsupported with clear message; phase 2 marker sidecar for edge cases
- [Risk] Large files exceed HTTP payload limits → Mitigation: monitor typical TES doc sizes; switch to multipart or object storage URL if needed
- [Risk] Parser library maintenance (pdf-parse unmaintained) → Mitigation: evaluate pdfjs-dist during implementation; abstract behind `parseDocument()` interface
- [Trade-off] No semantic retrieval across long channel history → Accepted: Requirements Canvas is the retrieval surface for MVP
- [Trade-off] External memory learning deferred → Accepted: phase 2 exercise with qdrant/supermemory when canvas-based recall becomes insufficient

## Migration Plan

N/A — This change resolves design decisions for greenfield implementation. No deployment migration required. Parent change `tes-slack-process-mvp` apply sequence unchanged; this change refines Tasks 5–6 scope.

Acceptance criteria:

- `parseDocument()` returns text for fixture PDF, DOCX, XLSX, TXT files
- Unsupported format/image-only PDF returns `{ supported: false }` without throw
- slack-app agent client sends raw bytes; contains no parser imports
- LangGraph graph has distinct `parseDocuments` and `analyzeRequirements` nodes

## Open Questions

- pdf-parse vs pdfjs-dist — decide during implementation based on fixture extraction quality
- Base64 JSON vs multipart HTTP — decide if dev-tenant testing reveals payload size issues
- Phase 2 channel memory architecture — Slack SoT + retrieval sidecar vs deeper integration (future change)
