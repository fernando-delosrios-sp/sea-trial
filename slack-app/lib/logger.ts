import {
  buildOtlpLogsPayload,
  createCorrelationId,
  isLoggingEnabled,
  otlpLogsUrl,
  parseOtlpHeaders,
  redactAttributes,
} from "@tes/observability/index.js";

type LogEventName =
  | "invoke.started"
  | "invoke.completed"
  | "invoke.failed"
  | "accept.started"
  | "accept.completed"
  | "thread_reply.evaluated"
  | "request.received"
  | "documents.parsed"
  | "agent.completed"
  | "request.failed";

export interface LoggerEnv {
  OTEL_LOGS_ENABLED?: string;
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_HEADERS?: string;
  OTEL_SERVICE_NAME?: string;
  OTEL_RESOURCE_ATTRIBUTES?: string;
}

export interface AppLogger {
  correlationId: string;
  emit: (
    eventName: LogEventName,
    attributes?: Record<string, unknown>,
    severity?: "INFO" | "ERROR",
  ) => void;
  flush: () => Promise<void>;
}

type PendingRecord = {
  eventName: LogEventName;
  correlationId: string;
  attributes: Record<string, unknown>;
  severity: "INFO" | "ERROR";
};

let testSink: PendingRecord[] | null = null;
let fetchImpl: typeof fetch = fetch;

export function setLogSinkForTests(sink: PendingRecord[] | null): void {
  testSink = sink;
}

export function setFetchImplForTests(impl: typeof fetch): void {
  fetchImpl = impl;
}

export function resetLoggerTestHooks(): void {
  testSink = null;
  fetchImpl = fetch;
}

export function createLogger(
  env: LoggerEnv,
  correlationId: string = createCorrelationId(),
): AppLogger {
  const pending: PendingRecord[] = [];

  return {
    correlationId,
    emit(eventName, attributes, severity = "INFO") {
      const record: PendingRecord = {
        eventName,
        correlationId,
        attributes: redactAttributes(attributes),
        severity,
      };

      if (testSink && isLoggingEnabled(env.OTEL_LOGS_ENABLED)) {
        testSink.push(record);
      }

      if (!isLoggingEnabled(env.OTEL_LOGS_ENABLED)) {
        return;
      }

      pending.push(record);
    },
    async flush() {
      if (pending.length === 0) {
        return;
      }

      const records = pending.splice(0, pending.length);
      await pushOtlpLogs(env, records);
    },
  };
}

async function pushOtlpLogs(
  env: LoggerEnv,
  records: PendingRecord[],
): Promise<void> {
  const endpoint = otlpLogsUrl(env.OTEL_EXPORTER_OTLP_ENDPOINT);
  if (!endpoint) {
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    ...parseOtlpHeaders(env.OTEL_EXPORTER_OTLP_HEADERS),
  };

  const payload = buildOtlpLogsPayload({
    serviceName: env.OTEL_SERVICE_NAME ?? "tes-slack-app",
    resourceAttributes: parseResourceAttributes(env.OTEL_RESOURCE_ATTRIBUTES),
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
    // Fail open — logging must not break Slack function execution.
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

export async function withLogger<T>(
  env: LoggerEnv,
  run: (logger: AppLogger) => Promise<T>,
): Promise<T> {
  const logger = createLogger(env);
  try {
    return await run(logger);
  } finally {
    await logger.flush();
  }
}
