export const CORRELATION_ID_HEADER = "X-Correlation-Id";

export function createCorrelationId(): string {
  return crypto.randomUUID();
}

export function readCorrelationId(
  headerValue: string | string[] | undefined,
): string | undefined {
  if (typeof headerValue === "string" && headerValue.trim()) {
    return headerValue.trim();
  }
  if (Array.isArray(headerValue) && headerValue[0]?.trim()) {
    return headerValue[0].trim();
  }
  return undefined;
}
