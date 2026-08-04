## Why

The TES Slack Process MVP specifies document parsing and agent memory at a high level but leaves critical implementation decisions open: where format extraction runs, which libraries to use, whether slack-app pre-processes files, and whether external memory services are needed. These gaps block Task 5 (parser pipeline) and Task 6 (Requirements Agent graph). Resolving them now unblocks implementation and prevents architectural drift during build.

## What Changes

**Format vs semantic parsing boundary**
- From: Parser libraries and transport format deferred; behavior-only spec
- To: Format parsing in agent-service `parsers/` (no LLM); semantic parsing in LangGraph nodes (LLM); slack-app sends raw bytes only
- Reason: Clean D3a boundary; mature Node parser ecosystem; testable pipeline
- Impact: Non-breaking — clarifies deferred decisions in existing spec

**MVP memory model**
- From: Implicit Slack-native memory; external tools (qdrant, supermemory) undecided
- To: Explicit confirmation that MVP requires Slack canvases/lists/thread only; external memory deferred to phase 2
- Reason: Full canvas + context passed on each invocation makes vector retrieval unnecessary for MVP
- Impact: Non-breaking — reaffirms D4/D5

**Supported document formats**
- From: PDF, DOCX, XLSX, text (behavior specified; library choice open)
- To: Text-based PDF, DOCX, XLSX, plain text via Node TS libraries; image-only PDFs return graceful unsupported
- Reason: Expected doc mix is structured office docs + selectable-text PDFs
- Impact: Non-breaking — narrows library selection

**Phase 2 roadmap**
- From: Candidate tools (markitdown, marker, qdrant, supermemory, gbrain) unclassified
- To: Explicit disposition — parser sidecars and external memory are phase 2 learning exercises
- Reason: Avoid scope creep while preserving future learning path
- Impact: Documentation only

## Capabilities

### New Capabilities

(none — refines existing capabilities)

### Modified Capabilities

- `requirements-agent`: Resolve deferred parser implementation — specify raw-byte transport, agent-service parser location, format/semantic node split, supported libraries direction, and graceful unsupported handling for image-only PDFs

## Impact

- **agent-service/** — `parsers/` module (pdf, docx, xlsx, text), `parseDocuments` LangGraph node
- **slack-app/** — file download and raw-byte encoding in agent HTTP client (no parsing logic)
- **packages/shared/** — `ParsedDocument`, `FilePayload` types (may already exist from MVP scaffold)
- **Dependencies** — Node packages: mammoth, xlsx/sheetjs, pdf-parse or pdfjs-dist (exact choice at implementation)
- **Out of scope** — qdrant, supermemory, gbrain, markitdown, marker, OCR, channel memory retrieval
