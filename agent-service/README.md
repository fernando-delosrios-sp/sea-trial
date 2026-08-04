# agent-service

Node.js HTTP service for TES Requirements Agent processing.

## Setup

```bash
cp .env.example .env
# Set LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
npm run dev
```

## Endpoints

### GET /health

Returns `{ "status": "ok" }`.

### POST /agents/requirements/process

Processes requirement documents and returns deliverable proposals.

**Request body:**

```json
{
  "context": { "...TesEventContext" },
  "requirementsCanvasMarkdown": "# Requirements...",
  "existingDeliverables": [],
  "files": [
    {
      "filename": "req.txt",
      "mimeType": "text/plain",
      "contentBase64": "<base64-encoded raw bytes>"
    }
  ],
  "threadHistory": "optional thread ts"
}
```

Legacy clients may send `documents[].content` (base64) instead of `files[].contentBase64`.

**Shared types:**

| Type | Purpose |
|------|---------|
| `FilePayload` | Transport: raw file bytes as base64 in JSON |
| `ParsedDocument` | Parser output: `{ filename, mimeType, text, supported, error? }` |
| `DocumentInput` | Internal decoded bytes after HTTP decode |

**Response:**

```json
{
  "canvasMarkdown": "# Updated Requirements Canvas...",
  "proposals": [
    {
      "taskId": "TES-001",
      "category": "Requirements",
      "requirements": "...",
      "sourceDocRef": "...",
      "suggestedStatus": "Not started"
    }
  ],
  "agentMessage": "Extracted N deliverable proposal(s)...",
  "needsClarification": false,
  "clarificationQuestions": []
}
```

**Errors:**

- `500` with `{ "error": "..." }` when LLM config missing or processing fails

## Document parsing

Parsing runs in `src/parsers/` using Node libraries:

- **TXT/MD** — UTF-8 pass-through
- **DOCX** — mammoth
- **XLSX** — sheetjs/xlsx
- **PDF** — pdf-parse v2 (`PDFParse.getText()`)

Unsupported formats and image-only PDFs return `supported: false` with a human-readable error. The LangGraph `parseDocuments` node runs before semantic analysis; results appear in the canvas **Documents processed** section.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_API_KEY` | Yes | OpenAI-compatible API key |
| `LLM_BASE_URL` | No | Default: `https://api.openai.com/v1` |
| `LLM_MODEL` | No | Default: `gpt-4o` |
| `PORT` | No | Default: `3000` |

## Tests

```bash
npm test
```

Fixtures under `tests/fixtures/` cover TXT, DOCX, XLSX, text-based PDF, and image-only PDF. Regenerate with:

```bash
node scripts/generate-fixtures.mjs
```

## Phase 2 roadmap

- **markitdown / marker** — Python sidecar for complex PDF layouts and OCR
- **qdrant / supermemory** — External memory when Requirements Canvas recall is insufficient
