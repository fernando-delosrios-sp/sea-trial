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

### POST /agents/delivery/consolidate

Consolidates a Delivery Template Canvas draft from a Deliverables List row and optional existing canvas markdown.

**Request body:**

```json
{
  "context": { "...TesEventContext" },
  "row": {
    "taskId": "TES-001",
    "assigneeId": "U123",
    "status": "Validation required",
    "situation": "Testing",
    "category": "SSO",
    "requirements": "Configure SSO integration",
    "openQuestions": "Which IdP?"
  },
  "canvasMarkdown": "optional existing canvas markdown"
}
```

**Response:**

```json
{
  "canvasMarkdown": "# Delivery: TES-001\n...",
  "draftVersion": 1
}
```

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
| `DocumentImagePayload` | Visual payload: page screenshot or figure buffer/base64 |
| `ParsedDocument` | Parser output: `{ filename, mimeType, text, images?, supported, error? }` |
| `DocumentInput` | Internal decoded bytes after HTTP decode |
| `RequirementsProposal` | Staged proposal summary, candidate deliverables, and canvas diff |

**Response:**

```json
{
  "canvasMarkdown": "# Updated Requirements Canvas...",
  "proposals": [
    {
      "taskId": "TES-001",
      "category": "Requirements",
      "requirements": "[Architecture.pdf] Configure SSO...",
      "sourceDocRef": "Architecture.pdf",
      "provenanceTag": "[Architecture.pdf]",
      "suggestedStatus": "Not started"
    }
  ],
  "proposal": {
    "summary": "Proposed 1 requirement deliverable(s)...",
    "sourceFiles": ["Architecture.pdf"],
    "candidateDeliverables": [...],
    "proposedCanvasMarkdown": "..."
  },
  "agentMessage": "Extracted N deliverable proposal(s)...",
  "needsClarification": false,
  "clarificationQuestions": []
}
```

**Errors:**

- `500` with `{ "error": "..." }` when LLM config missing or processing fails

## Document parsing & Multimodal Vision Pipeline

Parsing runs in `src/parsers/` using Node-compatible rendering and parsers:

- **TXT/MD** — UTF-8 pass-through
- **DOCX** — mammoth
- **XLSX** — sheetjs/xlsx
- **PDF** — pdf-parse v2 (`PDFParse.getText()` and `PDFParse.getScreenshot()` for rendering page images)
- **PNG / JPEG** — native visual payload parser with magic byte validation

Scanned and image-rich PDFs render pages to image buffers alongside any extractable text. Corrupt or unrenderable image files return `supported: false` with human-readable extraction errors. The LangGraph `parseDocuments` node extracts text and page image buffers; `analyzeRequirements` forwards visual payloads to the vision LLM, tags each requirement with `[filename.ext]` source provenance, and reconciles revisions against existing canvas requirements. Results appear in the canvas **Documents processed** section.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_API_KEY` | Yes | OpenAI-compatible API key |
| `LLM_BASE_URL` | No | Default: `https://api.openai.com/v1` |
| `LLM_MODEL` | No | Default: `gpt-4o` (multimodal vision LLM recommended) |
| `PORT` | No | Default: `3000` |

## Observability (Grafana Cloud OTLP)

When `OTEL_LOGS_ENABLED=true`, the service pushes structured logs to Grafana Cloud via OTLP HTTP (`/v1/logs`).

| Variable | Required | Description |
|----------|----------|-------------|
| `OTEL_LOGS_ENABLED` | No | Kill switch (`false` by default) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | When enabled | Grafana Cloud OTLP base URL |
| `OTEL_EXPORTER_OTLP_HEADERS` | When enabled | Authorization header |
| `OTEL_SERVICE_NAME` | No | Default: `sea-trial-agent-service` |

Log events: `request.received`, `documents.parsed`, `agent.completed`, `request.failed`. Reads `X-Correlation-Id` from slack-app requests.

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

