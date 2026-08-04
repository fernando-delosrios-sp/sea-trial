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
  "documents": [
    {
      "filename": "req.txt",
      "mimeType": "text/plain",
      "content": "<base64-encoded bytes>"
    }
  ],
  "threadHistory": "optional thread ts"
}
```

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
