import { redactAttributes } from "./redact.js";
import type { OtlpLogRecordInput } from "./types.js";

const SEVERITY_NUMBER: Record<string, number> = {
  INFO: 9,
  ERROR: 17,
};

function toOtlpAttributes(
  attributes: Record<string, unknown>,
): Array<{ key: string; value: { stringValue: string } }> {
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value: { stringValue: String(value) },
  }));
}

export function buildOtlpLogsPayload(options: {
  serviceName: string;
  resourceAttributes?: Record<string, string>;
  records: OtlpLogRecordInput[];
}): {
  resourceLogs: Array<{
    resource: { attributes: Array<{ key: string; value: { stringValue: string } }> };
    scopeLogs: Array<{
      scope: { name: string };
      logRecords: Array<{
        timeUnixNano: string;
        severityNumber: number;
        severityText: string;
        body: { stringValue: string };
        attributes: Array<{ key: string; value: { stringValue: string } }>;
      }>;
    }>;
  }>;
} {
  const resourceAttributes = {
    "service.name": options.serviceName,
    ...options.resourceAttributes,
  };

  const logRecords = options.records.map((record) => {
    const attributes = redactAttributes({
      eventName: record.eventName,
      ...(record.correlationId ? { correlationId: record.correlationId } : {}),
      ...record.attributes,
    });

    const severity = record.severity ?? "INFO";

    return {
      timeUnixNano: `${Date.now()}000000`,
      severityNumber: SEVERITY_NUMBER[severity] ?? 9,
      severityText: severity,
      body: { stringValue: record.body ?? record.eventName },
      attributes: toOtlpAttributes(attributes),
    };
  });

  return {
    resourceLogs: [{
      resource: {
        attributes: toOtlpAttributes(resourceAttributes),
      },
      scopeLogs: [{
        scope: { name: "sea-trial" },
        logRecords,
      }],
    }],
  };
}

export function parseOtlpHeaders(
  headerEnv: string | undefined,
): Record<string, string> {
  if (!headerEnv?.trim()) {
    return {};
  }

  const headers: Record<string, string> = {};
  for (const part of headerEnv.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = part.slice(0, separator).trim();
    const value = decodeURIComponent(part.slice(separator + 1).trim());
    if (key) {
      headers[key] = value;
    }
  }
  return headers;
}

export function isLoggingEnabled(envValue: string | undefined): boolean {
  return envValue === "true";
}

export function otlpLogsUrl(endpoint: string | undefined): string | undefined {
  if (!endpoint?.trim()) {
    return undefined;
  }
  const base = endpoint.replace(/\/$/, "");
  return `${base}/v1/logs`;
}
