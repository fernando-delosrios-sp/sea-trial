import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@tes/shared/types/index.ts";
import { CORRELATION_ID_HEADER, createCorrelationId } from "@tes/observability/index.js";
import {
  buildInvokeAgentRequest,
  callRequirementsAgent,
} from "../lib/agent-client.ts";
import { buildOutgoingDomains } from "../lib/outgoing-domains.ts";
import {
  createLogger,
  resetLoggerTestHooks,
  setFetchImplForTests,
  setLogSinkForTests,
} from "../lib/logger.ts";

const completeContext: TesEventContext = {
  channelId: "C1",
  projectName: "Acme",
  onboardingComplete: true,
  derivedComponents: ["IdentityNow"],
  dashboardCanvasId: "d1",
  requirementsCanvasId: "r1",
  deliverablesListId: "l1",
  incidentsListId: "l2",
  infrastructureCanvasId: "i1",
};

Deno.test("outgoingDomains includes files.slack.com for canvas banner uploads", () => {
  const domains = buildOutgoingDomains(undefined, undefined);
  assertEquals(domains.includes("files.slack.com"), true);
});

Deno.test("outgoingDomains includes agent-service and OTLP gateway hosts", () => {
  const domains = buildOutgoingDomains(
    "https://tes-agent.onrender.com",
    "https://otlp-gateway-prod-eu-west-6.grafana.net/otlp",
  );

  assertEquals(domains.includes("tes-agent.onrender.com"), true);
  assertEquals(domains.includes("otlp-gateway-prod-eu-west-6.grafana.net"), true);
  assertEquals(domains.includes("localhost"), false);
});

Deno.test("callRequirementsAgent sends X-Correlation-Id header", async () => {
  let capturedHeader = "";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    capturedHeader = headers.get(CORRELATION_ID_HEADER) ?? "";
    return new Response(
      JSON.stringify({
        canvasMarkdown: "# Requirements",
        proposals: [],
        agentMessage: "ok",
        needsClarification: false,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  try {
    await callRequirementsAgent(
      "http://localhost:3000",
      buildInvokeAgentRequest(completeContext, "# Requirements", []),
      "corr-test-abc",
    );
    assertEquals(capturedHeader, "corr-test-abc");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("logger flush pushes OTLP payload when enabled", async () => {
  resetLoggerTestHooks();

  let capturedUrl = "";
  let capturedBody = "";

  setFetchImplForTests(async (input, init) => {
    capturedUrl = String(input);
    capturedBody = String(init?.body ?? "");
    return new Response(null, { status: 200 });
  });

  const logger = createLogger({
    OTEL_LOGS_ENABLED: "true",
    OTEL_EXPORTER_OTLP_ENDPOINT: "https://otlp-gateway-prod-eu-west-6.grafana.net/otlp",
    OTEL_EXPORTER_OTLP_HEADERS: "Authorization=Basic%20test",
    OTEL_SERVICE_NAME: "tes-slack-app",
  }, createCorrelationId());

  logger.emit("invoke.started", { fileCount: 1 });
  await logger.flush();

  assertEquals(
    capturedUrl,
    "https://otlp-gateway-prod-eu-west-6.grafana.net/otlp/v1/logs",
  );
  assertEquals(capturedBody.includes("invoke.started"), true);
  assertEquals(capturedBody.includes(logger.correlationId), true);
  assertEquals(capturedBody.includes("contentBase64"), false);

  resetLoggerTestHooks();
});

Deno.test("logger does not push when OTEL_LOGS_ENABLED is false", async () => {
  resetLoggerTestHooks();

  let fetchCalled = false;
  setFetchImplForTests(async () => {
    fetchCalled = true;
    return new Response(null, { status: 200 });
  });

  const sink: Parameters<typeof setLogSinkForTests>[0] = [];
  setLogSinkForTests(sink);

  const logger = createLogger({ OTEL_LOGS_ENABLED: "false" });
  logger.emit("invoke.started", { fileCount: 0 });
  await logger.flush();

  assertEquals(fetchCalled, false);
  assertEquals(sink.length, 0);

  resetLoggerTestHooks();
});

Deno.test("logger flush does not throw when OTLP export fails", async () => {
  resetLoggerTestHooks();

  setFetchImplForTests(async () => {
    throw new Error("network down");
  });

  const logger = createLogger({
    OTEL_LOGS_ENABLED: "true",
    OTEL_EXPORTER_OTLP_ENDPOINT: "https://otlp-gateway-prod-eu-west-6.grafana.net/otlp",
    OTEL_EXPORTER_OTLP_HEADERS: "Authorization=Basic%20test",
  }, createCorrelationId());

  logger.emit("invoke.started", { fileCount: 0 });
  await logger.flush();

  resetLoggerTestHooks();
});


