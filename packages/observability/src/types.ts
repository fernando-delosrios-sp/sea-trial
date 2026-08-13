export type LogEventName =
  | "invoke.started"
  | "invoke.completed"
  | "invoke.failed"
  | "accept.started"
  | "accept.completed"
  | "thread_reply.evaluated"
  | "request.received"
  | "documents.parsed"
  | "agent.completed"
  | "request.failed"
  | "delivery.consolidation.received"
  | "delivery.consolidation.completed"
  | "delivery.consolidation.failed";

export interface LogEvent {
  name: LogEventName;
  attributes?: Record<string, unknown>;
}

export type LogSeverity = "INFO" | "ERROR";

export interface OtlpLogRecordInput {
  eventName: LogEventName | string;
  correlationId?: string;
  attributes?: Record<string, unknown>;
  severity?: LogSeverity;
  body?: string;
}
