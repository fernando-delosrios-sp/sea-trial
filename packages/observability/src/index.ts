export type { LogEvent, LogEventName, LogSeverity, OtlpLogRecordInput } from "./types.js";
export {
  CORRELATION_ID_HEADER,
  createCorrelationId,
  readCorrelationId,
} from "./correlation.js";
export { isForbiddenKey, redact, redactAttributes } from "./redact.js";
export {
  buildOtlpLogsPayload,
  isLoggingEnabled,
  otlpLogsUrl,
  parseOtlpHeaders,
} from "./otlp.js";
