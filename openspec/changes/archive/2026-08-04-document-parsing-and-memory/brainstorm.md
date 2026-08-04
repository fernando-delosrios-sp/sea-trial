# Brainstorm — Document Parsing and Memory Architecture

Raw capture of the design exploration session (2026-08-04).

## Background

The TES Event Process MVP (`tes-slack-process-mvp`) specifies document parsing and agent memory at a high level but defers implementation decisions:

- Where to split **format parsing** (bytes → plain text) vs **semantic parsing** (LLM-driven requirement extraction)
- Which parser libraries to use
- Whether slack-app sends raw bytes or pre-processed content
- Whether external memory tools (qdrant, supermemory, gbrain) are needed for MVP

The user explored several candidate projects: supermemory, gbrain, markitdown, qdrant, marker, OB1. Channel memory is low business value for MVP but desirable as a learning exercise for future projects.

Existing architecture constraints (from `tes-slack-process-mvp`):

- **D3a:** slack-app = Slack adapter only; agent-service = reasoning engine (parsing, LangGraph, LLM)
- **D4:** Slack objects as sole source of truth — no Postgres/Redis/vector DB
- **D5:** Requirements Canvas as intermediate task memory between sessions
- Document parser libraries explicitly deferred in design open questions

## Decision Chain

### Q1: External memory for MVP (D4 strict vs hybrid vs learning-first)

**Context presented:** Three memory layers already in spec — event context (Dashboard metadata), task memory (Requirements Canvas), accepted outputs (Deliverables List). Multi-turn uses Slack thread + re-invoke with full canvas.

**User response:** Needed to understand what memory MVP requires and how document processing works before deciding. Impression that most memory stuff can wait for phase 2.

**Answer (confirmed):** MVP needs Slack-native memory only. External memory (qdrant, supermemory, gbrain) deferred to phase 2. Channel memory is a future learning exercise, not MVP scope.

### Q2: Expected document mix for parser selection

**Answer:** **A + PDF** — mostly structured office docs (DOCX, XLSX, plain text) plus text-based PDFs. Not expecting scanned/complex PDFs for MVP.

Implications:

- TS Node libraries sufficient: mammoth (DOCX), sheetjs/xlsx (XLSX), pdf-parse or pdfjs-dist (PDF), trivial text pass-through
- marker (complex layout/OCR) and markitdown (Python sidecar) deferred to phase 2
- Image-only PDFs return `supported: false` with clear message (already in spec)

### Q3: Parsing architecture approach

Three approaches presented:

1. **Agent-service TS parsers + Slack-only memory** — slack-app sends raw bytes; agent-service runs format → text then LangGraph semantic analysis
2. **Split parsing** — light extraction in slack-app, semantic in agent-service — **rejected** (Deno parser ecosystem weak, blurs boundary)
3. **Python parser sidecar** (markitdown/marker) — **deferred to phase 2**

**Answer:** **Approach 1**

### Q4: Architecture section approval

Component split confirmed:

- slack-app: download bytes, load context/canvas/list, POST to agent-service, apply response
- agent-service: `parsers/` (no LLM) → LangGraph graph (LLM for semantic work)
- LangGraph nodes: loadContext → parseDocuments → analyzeRequirements → clarifyOrPropose → formatOutput

User confirmed Approach 1 before architecture section walkthrough completed; proceeding to opsx-propose.

## Approaches Considered

### A) Agent-service TS parsers + Slack-only memory — **CHOSEN**

All format parsing in agent-service `parsers/` using Node TS libraries. slack-app sends raw file bytes. Memory stays in Slack canvases and lists. Semantic analysis in LangGraph `analyzeRequirements` node.

### B) Split parsing across slack-app and agent-service — REJECTED

Pre-extract text in Deno slack-app for simple formats. Weak Deno parser ecosystem; duplicates logic; violates clean adapter boundary without payload-size benefit at MVP scale.

### C) Python parser sidecar (markitdown/marker) — DEFERRED

Separate microservice for unified format conversion. Best format coverage but extra deployable and ops complexity. Revisit in phase 2 for exotic formats or scanned PDFs.

### D) External memory layer (qdrant + supermemory/gbrain) — DEFERRED

Hybrid or learning-first external store for channel memory and semantic retrieval. Not needed when full canvas + context is passed on each invocation. Phase 2 learning exercise.

## Agreed Design Summary

- **Format vs semantic split:** Format parsing in agent-service `parseDocuments` node (no LLM). Semantic parsing in `analyzeRequirements` and downstream nodes (LLM).
- **Transport:** slack-app sends raw bytes as base64 in `FilePayload[]`; no pre-processing in slack-app.
- **Supported MVP formats:** PDF (text-based), DOCX, XLSX, plain text.
- **Unsupported handling:** `{ supported: false, error }` without unhandled throws (existing spec behavior).
- **MVP memory:** Slack-native only — TesEventContext, Requirements Canvas, Deliverables List, agent thread. No vector DB or external memory service.
- **Phase 2 additions:** qdrant/supermemory for channel memory learning; markitdown/marker for complex PDFs and exotic formats.

## Candidate Projects — Disposition

| Project | Role | MVP disposition |
|---------|------|-----------------|
| markitdown | Unified format → markdown | Phase 2 (Python sidecar) |
| marker | Complex PDF layout/OCR | Phase 2 (scanned PDFs out of MVP scope) |
| qdrant | Vector store | Phase 2 (channel memory exercise) |
| supermemory | AI memory layer | Phase 2 |
| gbrain | Knowledge/memory | Phase 2 |
| OB1 | TBD — agent orchestration adjacent | Not evaluated for MVP |

## Open Items Deferred

- Exact TS library choices (pdf-parse vs pdfjs-dist) — decide during implementation
- Base64 vs multipart HTTP for file transport — implementation detail
- Phase 2 channel memory architecture (Slack SoT + external retrieval sidecar vs full migration)
