import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createAppServer } from "../src/server.js";
import { extractDeliverables } from "../src/agents/requirements/extract-deliverables.js";
import { setSemanticAnalyzerForTests } from "../src/agents/requirements/semantic-analyzer.js";

describe("POST /agents/requirements/process", () => {
  beforeEach(() => {
    process.env.LLM_API_KEY = "test-key";
    setSemanticAnalyzerForTests(async (input) =>
      extractDeliverables(input.parsedTexts, input.derivedComponents)
    );
  });

  afterEach(() => {
    delete process.env.LLM_API_KEY;
    setSemanticAnalyzerForTests(null);
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

