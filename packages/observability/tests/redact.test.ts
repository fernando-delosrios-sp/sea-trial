import { describe, expect, it } from "vitest";
import { createCorrelationId } from "../src/correlation.js";
import { buildOtlpLogsPayload, isLoggingEnabled } from "../src/otlp.js";
import { redact, redactAttributes } from "../src/redact.js";

describe("redact", () => {
  it("strips forbidden keys at any depth", () => {
    const input = {
      correlationId: "abc",
      contentBase64: "secret-bytes",
      requirementsCanvasMarkdown: "# Secret canvas",
      nested: {
        text: "document text",
        filename: "req.txt",
      },
    };

    expect(redact(input)).toEqual({
      correlationId: "abc",
      nested: { filename: "req.txt" },
    });
  });

  it("redactAttributes returns empty object for undefined", () => {
    expect(redactAttributes(undefined)).toEqual({});
  });
});

describe("createCorrelationId", () => {
  it("returns a UUID string", () => {
    const id = createCorrelationId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

describe("buildOtlpLogsPayload", () => {
  it("excludes forbidden fields from exported attributes", () => {
    const payload = buildOtlpLogsPayload({
      serviceName: "sea-trial-agent-service",
      records: [{
        eventName: "documents.parsed",
        correlationId: "corr-1",
        attributes: {
          filename: "req.txt",
          contentBase64: "must-not-export",
        },
      }],
    });

    const attributes = payload.resourceLogs[0].scopeLogs[0].logRecords[0]
      .attributes;
    const keys = attributes.map((a) => a.key);
    expect(keys).toContain("filename");
    expect(keys).not.toContain("contentBase64");
  });
});

describe("isLoggingEnabled", () => {
  it("is true only when env is exactly true", () => {
    expect(isLoggingEnabled("true")).toBe(true);
    expect(isLoggingEnabled("false")).toBe(false);
    expect(isLoggingEnabled(undefined)).toBe(false);
  });
});
