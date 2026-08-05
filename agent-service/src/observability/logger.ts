import {
  buildOtlpLogsPayload,
  isLoggingEnabled,
  otlpLogsUrl,
  parseOtlpHeaders,
  redactAttributes,
  type LogEventName,
} from "@tes-event-process/observability";

export interface EmittedLog {
  eventName: LogEventName | string;
  correlationId: string;
  attributes: Record<string, unknown>;
  severity?: "INFO" | "ERROR";
}

let testSink: EmittedLog[] | null = null;
let fetchImpl: typeof fetch = fetch;

export function setLogSinkForTests(sink: EmittedLog[] | null): void {
  testSink = sink;
}

export function setFetchImplForTests(impl: typeof fetch | null): void {
  fetchImpl = impl ?? fetch;
}

export function resetLoggerTestHooks(): void {
  testSink = null;
  fetchImpl = fetch;
}

export interface RequestLogger {
  correlationId: string;
  emit: (
    eventName: LogEventName,
    attributes?: Record<string, unknown>,
    severity?: "INFO" | "ERROR",
  ) => void;
  flush: () => Promise<void>;
}

export function createRequestLogger(correlationId: string): RequestLogger {
  const pending: EmittedLog[] = [];

  return {
    correlationId,
    emit(eventName, attributes, severity = "INFO") {
      const record: EmittedLog = {
        eventName,
        correlationId,
        attributes: redactAttributes(attributes),
        severity,
      };

      if (testSink && isLoggingEnabled(process.env.OTEL_LOGS_ENABLED)) {
        testSink.push(record);
      }

      if (!isLoggingEnabled(process.env.OTEL_LOGS_ENABLED)) {
        return;
      }

      pending.push(record);
    },
    async flush() {
      if (pending.length === 0) {
        return;
      }

      const records = pending.splice(0, pending.length);
      await pushOtlpLogs(records);
    },
  };
}

async function pushOtlpLogs(records: EmittedLog[]): Promise<void> {
  const endpoint = otlpLogsUrl(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
  if (!endpoint) {
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    ...parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
  };

  const payload = buildOtlpLogsPayload({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "tes-agent-service",
    resourceAttributes: parseResourceAttributes(
      process.env.OTEL_RESOURCE_ATTRIBUTES,
    ),
    records: records.map((record) => ({
      eventName: record.eventName,
      correlationId: record.correlationId,
      attributes: record.attributes,
      severity: record.severity,
    })),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    // Fail open — logging must not break request handling.
  } finally {
    clearTimeout(timeout);
  }
}

function parseResourceAttributes(
  value: string | undefined,
): Record<string, string> | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const attributes: Record<string, string> = {};
  for (const part of value.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = part.slice(0, separator).trim();
    const attributeValue = part.slice(separator + 1).trim();
    if (key) {
      attributes[key] = attributeValue;
    }
  }
  return attributes;
}
