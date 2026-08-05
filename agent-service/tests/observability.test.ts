import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildOtlpLogsPayload } from "@tes-event-process/observability";
import { redactAttributes } from "@tes-event-process/observability";
import {
  createRequestLogger,
  resetLoggerTestHooks,
  setFetchImplForTests,
} from "../src/observability/logger.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("observability redaction", () => {
  it("excludes forbidden fields from exported OTLP payload", () => {
    const payload = buildOtlpLogsPayload({
      serviceName: "tes-agent-service",
      records: [{
        eventName: "documents.parsed",
        correlationId: "corr-1",
        attributes: {
          filename: "req.txt",
          contentBase64: "secret",
          requirementsCanvasMarkdown: "# secret",
        },
      }],
    });

    const attributes = payload.resourceLogs[0].scopeLogs[0].logRecords[0]
      .attributes;
    const keys = attributes.map((entry) => entry.key);
    expect(keys).toContain("filename");
    expect(keys).not.toContain("contentBase64");
    expect(keys).not.toContain("requirementsCanvasMarkdown");
  });

  it("redactAttributes strips nested sensitive keys", () => {
    expect(redactAttributes({
      channelId: "C1",
      text: "secret document text",
    })).toEqual({ channelId: "C1" });
  });
});

describe("agent-service OTLP export", () => {
  beforeEach(() => {
    process.env.OTEL_LOGS_ENABLED = "true";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT =
      "https://otlp-gateway-prod-eu-west-6.grafana.net/otlp";
    process.env.OTEL_EXPORTER_OTLP_HEADERS = "Authorization=Basic%20test";
    process.env.OTEL_SERVICE_NAME = "tes-agent-service";
  });

  afterEach(() => {
    delete process.env.OTEL_LOGS_ENABLED;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_HEADERS;
    delete process.env.OTEL_SERVICE_NAME;
    resetLoggerTestHooks();
  });

  it("flush pushes OTLP payload with service.name tes-agent-service", async () => {
    let capturedUrl = "";
    let capturedBody = "";

    setFetchImplForTests(async (input, init) => {
      capturedUrl = String(input);
      capturedBody = String(init?.body ?? "");
      return new Response(null, { status: 200 });
    });

    const logger = createRequestLogger("corr-agent-otlp");
    logger.emit("request.received", { fileCount: 1 });
    await logger.flush();

    expect(capturedUrl).toBe(
      "https://otlp-gateway-prod-eu-west-6.grafana.net/otlp/v1/logs",
    );
    expect(capturedBody).toContain("tes-agent-service");
    expect(capturedBody).toContain("request.received");
    expect(capturedBody).toContain("corr-agent-otlp");
  });

  it("flush does not throw when OTLP export fails", async () => {
    setFetchImplForTests(async () => {
      throw new Error("network down");
    });

    const logger = createRequestLogger("corr-agent-fail-open");
    logger.emit("request.received", { fileCount: 0 });
    await expect(logger.flush()).resolves.toBeUndefined();
  });
});

describe("deploy workflow OTLP config", () => {
  it("syncs OTLP env vars to Render and slack-app", () => {
    const workflow = readFileSync(
      join(repoRoot, ".github/workflows/deploy.yml"),
      "utf8",
    );

    expect(workflow).toContain("OTEL_EXPORTER_OTLP_ENDPOINT");
    expect(workflow).toContain("OTEL_EXPORTER_OTLP_HEADERS");
    expect(workflow).toContain("OTEL_LOGS_ENABLED");
    expect(workflow).toContain("OTEL_SERVICE_NAME");
    expect(workflow).toContain("slack env set OTEL_EXPORTER_OTLP_ENDPOINT");
    expect(workflow).toContain('if [ "${OTEL_LOGS_ENABLED:-false}" = "true" ]');
  });
});
