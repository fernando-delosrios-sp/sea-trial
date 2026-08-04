# Document Parsing and Memory Architecture Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Implement the document parsing pipeline (format extraction in agent-service, raw-byte transport from slack-app) and confirm Slack-native MVP memory, resolving deferred parser decisions from `tes-slack-process-mvp`.

**Architecture:** slack-app sends raw file bytes via `FilePayload[]`; agent-service `parsers/` module extracts plain text using Node TS libraries (mammoth, xlsx, pdf-parse/pdfjs-dist); LangGraph `parseDocuments` node runs before `analyzeRequirements` (no LLM in format stage); Requirements Canvas is sole task memory — no external vector store.

**Tech Stack:** TypeScript, Node.js 20+, mammoth, xlsx/sheetjs, pdf-parse or pdfjs-dist, LangGraph.js, Deno Slack SDK (transport only)

**Parent change:** Implements/refines Tasks 5–6 of `tes-slack-process-mvp`. Requires monorepo scaffold (Task 1) to exist first.

**Canonical test commands:**
- `cd agent-service && npm test`
- `cd slack-app && deno task test`
- `openspec validate --all --json`

**Design reference:** `openspec/changes/document-parsing-and-memory/design.md`
**Spec reference:** `openspec/changes/document-parsing-and-memory/specs/requirements-agent/spec.md`

---

## Task 1: Shared types for document transport

**Files:**
- Modify: `packages/shared/src/types/index.ts`

**Spec scenarios:** Raw byte file transport, Format parsing without LLM

- [ ] **Step 1:** Write failing test importing `FilePayload` and `ParsedDocument` from shared types
- [ ] **Step 2:** Add types:

```typescript
export interface FilePayload {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export interface ParsedDocument {
  filename: string;
  mimeType: string;
  text: string;
  supported: boolean;
  error?: string;
}
```

- [ ] **Step 3:** Export from shared index; verify Node import in agent-service
- [ ] **Step 4:** Verify Deno `npm:` import path in slack-app compiles
- [ ] **Step 5:** Commit `feat(shared): add FilePayload and ParsedDocument types`

---

## Task 2: Parser module — text and DOCX

**Files:**
- Create: `agent-service/src/parsers/index.ts`, `agent-service/src/parsers/text.ts`, `agent-service/src/parsers/docx.ts`
- Create: `agent-service/tests/parsers/text.test.ts`, `agent-service/tests/parsers/docx.test.ts`
- Create: `agent-service/tests/fixtures/sample.txt`, `agent-service/tests/fixtures/sample.docx`

**Spec scenarios:** Supported format parsing (TXT, DOCX), Unsupported format handling

- [ ] **Step 1:** Install mammoth: `cd agent-service && npm install mammoth`
- [ ] **Step 2:** Write failing test — plain text returns `{ supported: true, text: "..." }`
- [ ] **Step 3:** Implement `text.ts` pass-through parser
- [ ] **Step 4:** Write failing test — DOCX fixture returns extracted text with `supported: true`
- [ ] **Step 5:** Implement `docx.ts` using mammoth
- [ ] **Step 6:** Write failing test — unknown mime type returns `{ supported: false, error }` without throw
- [ ] **Step 7:** Implement `parseDocument()` router in `index.ts` with mime/extension dispatch
- [ ] **Step 8:** Run `npm test` — all parser tests pass
- [ ] **Step 9:** Commit `feat(agent-service): add text and docx parsers`

---

## Task 3: Parser module — XLSX and PDF

**Files:**
- Create: `agent-service/src/parsers/xlsx.ts`, `agent-service/src/parsers/pdf.ts`
- Create: `agent-service/tests/parsers/xlsx.test.ts`, `agent-service/tests/parsers/pdf.test.ts`
- Create: `agent-service/tests/fixtures/sample.xlsx`, `agent-service/tests/fixtures/sample-text.pdf`, `agent-service/tests/fixtures/sample-image.pdf`

**Spec scenarios:** Supported format parsing (XLSX, PDF), Image-only PDF rejection

- [ ] **Step 1:** Install xlsx: `npm install xlsx`
- [ ] **Step 2:** Write failing test — XLSX fixture returns cell text with `supported: true`
- [ ] **Step 3:** Implement `xlsx.ts` extracting sheet cell values as plain text
- [ ] **Step 4:** Evaluate pdf-parse vs pdfjs-dist against `sample-text.pdf` fixture
- [ ] **Step 5:** Write failing test — text-based PDF returns extracted text with `supported: true`
- [ ] **Step 6:** Implement `pdf.ts` with chosen library
- [ ] **Step 7:** Write failing test — image-only PDF returns `{ supported: false, error: "...no extractable text" }`
- [ ] **Step 8:** Implement empty-text detection in `pdf.ts`
- [ ] **Step 9:** Run `npm test` — all parser tests pass
- [ ] **Step 10:** Commit `feat(agent-service): add xlsx and pdf parsers`

---

## Task 4: LangGraph parseDocuments node

**Files:**
- Create/modify: `agent-service/src/agents/requirements/graph.ts`, `agent-service/src/agents/requirements/state.ts`
- Create: `agent-service/tests/parse-documents-node.test.ts`

**Spec scenarios:** Format parsing without LLM, Graph node execution order, Parsed document recorded in canvas

- [ ] **Step 1:** Write failing test — `parseDocuments` node calls `parseDocument()` per file, no LLM mock invoked
- [ ] **Step 2:** Add `parsedDocuments: ParsedDocument[]` to graph state
- [ ] **Step 3:** Implement `parseDocuments` node iterating `FilePayload[]` buffers
- [ ] **Step 4:** Write failing test — graph executes parseDocuments before analyzeRequirements
- [ ] **Step 5:** Wire node edges: loadContext → parseDocuments → analyzeRequirements → clarifyOrPropose → formatOutput
- [ ] **Step 6:** Update `formatOutput` to include "Documents processed" section with per-file status
- [ ] **Step 7:** Run `npm test` — graph node tests pass
- [ ] **Step 8:** Commit `feat(agent-service): add parseDocuments LangGraph node`

---

## Task 5: Slack app raw byte transport

**Files:**
- Create/modify: `slack-app/lib/agent-client.ts`, `slack-app/functions/invoke_agent/mod.ts`
- Create: `slack-app/lib/agent-client_test.ts`

**Spec scenarios:** Slack app sends raw bytes, Slack adapter responsibilities (no parsing)

- [ ] **Step 1:** Write failing test — downloaded file bytes encoded as base64 in `FilePayload[]`
- [ ] **Step 2:** Implement base64 encoding in agent-client when building request body
- [ ] **Step 3:** Write failing test — slack-app module graph has no parser imports (static check or lint)
- [ ] **Step 4:** Verify invoke_agent downloads Slack files and passes raw content only
- [ ] **Step 5:** Run `deno task test` — transport tests pass
- [ ] **Step 6:** Commit `feat(slack-app): send raw file bytes to agent-service`

---

## Task 6: MVP memory verification

**Files:**
- Modify: `agent-service/tests/requirements-agent.test.ts`, `slack-app/lib/agent-client_test.ts`

**Spec scenarios:** Task memory from Requirements Canvas, No external memory dependency

- [ ] **Step 1:** Write failing test — re-invoke request includes full canvas markdown from prior session
- [ ] **Step 2:** Verify invoke flow reads Requirements Canvas before each agent call
- [ ] **Step 3:** Write test — agent-service package.json and imports contain no qdrant/supermemory references
- [ ] **Step 4:** Run full test suite: `cd agent-service && npm test && cd ../slack-app && deno task test`
- [ ] **Step 5:** Commit `test: verify Slack-native MVP memory model`

---

## Task 7: Documentation and changelog

**Files:**
- Modify: `README.md`, `agent-service/README.md` (if exists)

- [ ] **Step 1:** Document supported formats (text PDF, DOCX, XLSX, TXT) and unsupported behavior in README
- [ ] **Step 2:** Document `FilePayload` / `ParsedDocument` contract in agent-service section
- [ ] **Step 3:** Add phase 2 note for markitdown, marker, qdrant/supermemory
- [ ] **Step 4:** Create changelog entry for parsing architecture decisions
- [ ] **Step 5:** Commit `docs: document parsing pipeline and memory model`

---

## Verification checklist

- [ ] `parseDocument()` returns text for PDF, DOCX, XLSX, TXT fixtures
- [ ] Unsupported and image-only PDF return `{ supported: false }` without throw
- [ ] slack-app has no parser imports; sends base64 raw bytes
- [ ] LangGraph graph order: parseDocuments before analyzeRequirements
- [ ] Requirements Canvas "Documents processed" section updated per run
- [ ] No external memory service dependencies
