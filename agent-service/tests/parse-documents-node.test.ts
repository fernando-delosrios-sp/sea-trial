import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProcessRequirementsRequest } from "@tes-event-process/shared";
import {
  analyzeRequirements,
  loadContext,
  parseDocuments,
} from "../src/agents/requirements/graph.js";
import { extractDeliverables } from "../src/agents/requirements/extract-deliverables.js";
import * as parsers from "../src/parsers/index.js";
import {
  setSemanticAnalyzerForTests,
} from "../src/agents/requirements/semantic-analyzer.js";

const baseRequest: ProcessRequirementsRequest = {
  context: {
    channelId: "C1",
    projectName: "Acme",
    onboardingComplete: true,
    derivedComponents: ["IdentityNow"],
    dashboardCanvasId: "d1",
    requirementsCanvasId: "r1",
    deliverablesListId: "l1",
    incidentsListId: "l2",
    infrastructureCanvasId: "i1",
  },
  requirementsCanvasMarkdown: "# Requirements\n",
  existingDeliverables: [],
  documents: [{
    filename: "req.txt",
    mimeType: "text/plain",
    content: new TextEncoder().encode("Deliverable: Test item"),
  }],
};

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

describe("parseDocuments node", () => {
  it("invokes parseDocument per file without LLM", async () => {
    const parseSpy = vi.spyOn(parsers, "parseDocument");
    const state = loadContext(baseRequest);

    await parseDocuments(state, baseRequest.documents);

    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(parseSpy).toHaveBeenCalledWith({
      filename: "req.txt",
      mimeType: "text/plain",
      content: baseRequest.documents[0].content,
    });
    parseSpy.mockRestore();
  });

  it("stores ParsedDocument results in state", async () => {
    const state = loadContext(baseRequest);
    const updated = await parseDocuments(state, baseRequest.documents);

    expect(updated.parsedDocuments).toHaveLength(1);
    expect(updated.parsedDocuments[0].supported).toBe(true);
    expect(updated.parsedTexts).toHaveLength(1);
  });
});

describe("analyzeRequirements node", () => {
  it("invokes semantic analyzer on parsed text only", async () => {
    const llmSpy = vi.fn(async (input) =>
      extractDeliverables(input.parsedTexts, input.derivedComponents)
    );
    setSemanticAnalyzerForTests(llmSpy);

    const state = loadContext(baseRequest);
    const parsed = await parseDocuments(state, baseRequest.documents);
    const analyzed = await analyzeRequirements(parsed);

    expect(llmSpy).toHaveBeenCalledTimes(1);
    expect(llmSpy.mock.calls[0][0].parsedTexts).toEqual(parsed.parsedTexts);
    expect(llmSpy.mock.calls[0][0].requirementsCanvasMarkdown).toBe(
      baseRequest.requirementsCanvasMarkdown,
    );
    expect(analyzed.proposals.length).toBeGreaterThan(0);
    expect(analyzed.parsedDocuments).toEqual(parsed.parsedDocuments);
  });
});
