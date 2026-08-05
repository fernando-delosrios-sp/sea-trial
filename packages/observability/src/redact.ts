const FORBIDDEN_KEYS = new Set([
  "content",
  "contentBase64",
  "requirementsCanvasMarkdown",
  "canvasMarkdown",
  "text",
  "prompt",
  "response",
  "llmPrompt",
  "llmResponse",
  "authorization",
  "token",
  "apiKey",
  "LLM_API_KEY",
  "documents",
  "files",
]);

export function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEYS.has(key);
}

export function redact(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (isForbiddenKey(key)) {
        continue;
      }
      result[key] = redact(nested);
    }
    return result;
  }

  return value;
}

export function redactAttributes(
  attributes: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!attributes) {
    return {};
  }
  const redacted = redact(attributes);
  return typeof redacted === "object" && redacted !== null && !Array.isArray(redacted)
    ? redacted as Record<string, unknown>
    : {};
}
