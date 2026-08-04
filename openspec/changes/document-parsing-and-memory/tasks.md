## 1. Shared types for document transport and parsing

- [ ] 1.1 Add `FilePayload` type (`filename`, `mimeType`, `contentBase64`) to `packages/shared`
- [ ] 1.2 Add `ParsedDocument` type (`filename`, `mimeType`, `text`, `supported`, `error?`) to `packages/shared`
- [ ] 1.3 Export types from shared index and verify Deno + Node import paths

## 2. Document parser pipeline (agent-service)

- [ ] 2.1 Create `agent-service/src/parsers/index.ts` with unified `parseDocument(buffer, filename, mimeType)` entry point
- [ ] 2.2 Implement `agent-service/src/parsers/docx.ts` using mammoth — test: Supported format parsing (DOCX)
- [ ] 2.3 Implement `agent-service/src/parsers/xlsx.ts` using sheetjs/xlsx — test: Supported format parsing (XLSX)
- [ ] 2.4 Implement `agent-service/src/parsers/pdf.ts` using pdf-parse or pdfjs-dist — test: Supported format parsing (text-based PDF)
- [ ] 2.5 Implement `agent-service/src/parsers/text.ts` for plain text pass-through — test: Supported format parsing (TXT)
- [ ] 2.6 Implement unsupported format routing — test: Unsupported format handling
- [ ] 2.7 Implement image-only PDF detection — test: Image-only PDF rejection
- [ ] 2.8 Add fixture files and unit tests for all parser scenarios

## 3. LangGraph node separation

- [ ] 3.1 Create `parseDocuments` node that invokes `parseDocument()` per file without LLM — test: Format parsing without LLM
- [ ] 3.2 Ensure `analyzeRequirements` node receives parsed text only (no format logic) — test: Semantic analysis after format extraction
- [ ] 3.3 Wire graph node order: loadContext → parseDocuments → analyzeRequirements → clarifyOrPropose → formatOutput — test: Graph node execution order
- [ ] 3.4 Update Requirements Canvas "Documents processed" section with parse status per file — test: Parsed document recorded in canvas

## 4. Slack app raw byte transport

- [ ] 4.1 Update agent HTTP client to encode downloaded Slack files as `FilePayload[]` with base64 content — test: Slack app sends raw bytes
- [ ] 4.2 Verify slack-app has no parser library imports — test: Slack adapter responsibilities (no parsing)
- [ ] 4.3 Verify agent-service receives and parses bytes end-to-end — test: Agent-service receives bytes for parsing

## 5. MVP memory confirmation

- [ ] 5.1 Verify agent request includes full Requirements Canvas markdown on re-invoke — test: Task memory from Requirements Canvas
- [ ] 5.2 Confirm no vector store or external memory API imports in agent-service — test: No external memory dependency

## 6. Documentation

- [ ] 6.1 Update README with supported document formats (PDF text-based, DOCX, XLSX, TXT) and unsupported behavior
- [ ] 6.2 Document `FilePayload` and `ParsedDocument` types in agent-service API section
- [ ] 6.3 Add parser library choices and phase 2 roadmap (markitdown, marker, qdrant) to design docs or README

## 7. Changelog

- [ ] 7.1 Create or update changelog entry for document parsing architecture decisions
- [ ] 7.2 Confirm entry covers supported formats, parsing boundary, and deferred external memory
