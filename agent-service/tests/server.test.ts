import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createAppServer } from "../src/server.js";
import { extractDeliverables } from "../src/agents/requirements/extract-deliverables.js";
import { setSemanticAnalyzerForTests } from "../src/agents/requirements/semantic-analyzer.js";
import {
  setLogSinkForTests,
  type EmittedLog,
} from "../src/observability/logger.js";
import { CORRELATION_ID_HEADER } from "@tes-event-process/observability";

describe("POST /agents/requirements/process", () => {
  beforeEach(() => {
    process.env.LLM_API_KEY = "test-key";
    process.env.OTEL_LOGS_ENABLED = "true";
    setSemanticAnalyzerForTests(async (input) =>
      extractDeliverables(input.parsedTexts, input.derivedComponents)
    );
  });

  afterEach(() => {
    delete process.env.LLM_API_KEY;
    delete process.env.OTEL_LOGS_ENABLED;
    setSemanticAnalyzerForTests(null);
    setLogSinkForTests(null);
  });

  it("accepts FilePayload files array with contentBase64", async () => {
    const server = createAppServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const text = "Deliverable: Configure SSO\nDeliverable: Build campaign";
    const contentBase64 = btoa(text);

    const response = await fetch(
      `http://127.0.0.1:${address.port}/agents/requirements/process`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            channelId: "C1",
            projectName: "Test",
            onboardingComplete: true,
            derivedComponents: ["IdentityNow"],
            dashboardCanvasId: "d1",
            requirementsCanvasId: "r1",
            deliverablesListId: "l1",
            incidentsListId: "l2",
            infrastructureCanvasId: "i1",
            situationReportCanvasId: "sr1",
          },
          requirementsCanvasMarkdown: "# Requirements",
          existingDeliverables: [],
          files: [{
            filename: "req.txt",
            mimeType: "text/plain",
            contentBase64,
          }],
        }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.proposals.length).toBeGreaterThan(0);
    expect(body.canvasMarkdown).toContain("Documents processed");

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("returns proposals for valid request (legacy documents field)", async () => {
    const server = createAppServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const text = "Deliverable: Configure SSO\nDeliverable: Build campaign";
    const content = btoa(text);

    const response = await fetch(
      `http://127.0.0.1:${address.port}/agents/requirements/process`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            channelId: "C1",
            projectName: "Test",
            onboardingComplete: true,
            derivedComponents: ["IdentityNow"],
            dashboardCanvasId: "d1",
            requirementsCanvasId: "r1",
            deliverablesListId: "l1",
            incidentsListId: "l2",
            infrastructureCanvasId: "i1",
            situationReportCanvasId: "sr1",
          },
          requirementsCanvasMarkdown: "# Requirements",
          existingDeliverables: [],
          documents: [{
            filename: "req.txt",
            mimeType: "text/plain",
            content,
          }],
        }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.proposals.length).toBeGreaterThan(0);

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("fails with configuration error when LLM_API_KEY missing", async () => {
    delete process.env.LLM_API_KEY;
    const sink: EmittedLog[] = [];
    setLogSinkForTests(sink);

    const server = createAppServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const response = await fetch(
      `http://127.0.0.1:${address.port}/agents/requirements/process`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {},
          requirementsCanvasMarkdown: "",
          existingDeliverables: [],
          documents: [],
        }),
      },
    );

    expect(response.status).toBe(500);
    expect(sink.some((record) => record.eventName === "request.failed")).toBe(
      true,
    );
    expect(sink.every((record) => record.correlationId.length > 0)).toBe(true);

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("propagates correlation id from request header into log records", async () => {
    const sink: EmittedLog[] = [];
    setLogSinkForTests(sink);

    const server = createAppServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const text = "Deliverable: Configure SSO";
    const response = await fetch(
      `http://127.0.0.1:${address.port}/agents/requirements/process`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CORRELATION_ID_HEADER]: "corr-test-123",
        },
        body: JSON.stringify({
          context: {
            channelId: "C1",
            projectName: "Test",
            onboardingComplete: true,
            derivedComponents: ["IdentityNow"],
            dashboardCanvasId: "d1",
            requirementsCanvasId: "r1",
            deliverablesListId: "l1",
            incidentsListId: "l2",
            infrastructureCanvasId: "i1",
            situationReportCanvasId: "sr1",
          },
          requirementsCanvasMarkdown: "# Requirements",
          existingDeliverables: [],
          documents: [{
            filename: "req.txt",
            mimeType: "text/plain",
            content: btoa(text),
          }],
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(sink.some((record) => record.correlationId === "corr-test-123")).toBe(
      true,
    );
    expect(sink.some((record) => record.eventName === "request.received")).toBe(
      true,
    );
    expect(sink.some((record) => record.eventName === "documents.parsed")).toBe(
      true,
    );
    expect(sink.some((record) => record.eventName === "agent.completed")).toBe(
      true,
    );

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("generates correlation id when request header is missing", async () => {
    const sink: EmittedLog[] = [];
    setLogSinkForTests(sink);

    const server = createAppServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const text = "Deliverable: Configure SSO";
    const response = await fetch(
      `http://127.0.0.1:${address.port}/agents/requirements/process`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            channelId: "C1",
            projectName: "Test",
            onboardingComplete: true,
            derivedComponents: ["IdentityNow"],
            dashboardCanvasId: "d1",
            requirementsCanvasId: "r1",
            deliverablesListId: "l1",
            incidentsListId: "l2",
            infrastructureCanvasId: "i1",
            situationReportCanvasId: "sr1",
          },
          requirementsCanvasMarkdown: "# Requirements",
          existingDeliverables: [],
          documents: [{
            filename: "req.txt",
            mimeType: "text/plain",
            content: btoa(text),
          }],
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(sink.length).toBeGreaterThan(0);
    const correlationIds = new Set(sink.map((record) => record.correlationId));
    expect(correlationIds.size).toBe(1);
    expect([...correlationIds][0].length).toBeGreaterThan(0);

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("does not emit logs when OTEL_LOGS_ENABLED is not true", async () => {
    delete process.env.OTEL_LOGS_ENABLED;
    const sink: EmittedLog[] = [];
    setLogSinkForTests(sink);

    const server = createAppServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const response = await fetch(
      `http://127.0.0.1:${address.port}/agents/requirements/process`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            channelId: "C1",
            projectName: "Test",
            onboardingComplete: true,
            derivedComponents: ["IdentityNow"],
            dashboardCanvasId: "d1",
            requirementsCanvasId: "r1",
            deliverablesListId: "l1",
            incidentsListId: "l2",
            infrastructureCanvasId: "i1",
            situationReportCanvasId: "sr1",
          },
          requirementsCanvasMarkdown: "# Requirements",
          existingDeliverables: [],
          documents: [{
            filename: "req.txt",
            mimeType: "text/plain",
            content: btoa("Deliverable: SSO"),
          }],
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(sink.length).toBe(0);

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });
});

describe("POST /agents/delivery/consolidate", () => {
  it("returns consolidated canvas markdown", async () => {
    const server = createAppServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");

    const response = await fetch(
      `http://127.0.0.1:${address.port}/agents/delivery/consolidate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            channelId: "C1",
            projectName: "Test",
            onboardingComplete: true,
            derivedComponents: ["IdentityNow"],
            dashboardCanvasId: "d1",
            requirementsCanvasId: "r1",
            deliverablesListId: "l1",
            incidentsListId: "l2",
            infrastructureCanvasId: "i1",
          },
          row: {
            taskId: "TES-001",
            status: "Validation required",
            situation: "Testing",
            category: "SSO",
            requirements: "Configure SSO integration",
          },
        }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.draftVersion).toBe(1);
    expect(body.canvasMarkdown).toContain("TES-001");
    expect(body.canvasMarkdown).toContain("Agent draft — pending review");

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });
});

describe("createAppServer", () => {
  it("responds to GET /health", async () => {
    const server = createAppServer();

    await new Promise<void>((resolve) => {
      server.listen(0, resolve);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected server to listen on a TCP port");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
});
