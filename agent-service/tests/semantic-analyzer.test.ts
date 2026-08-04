import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LlmConfig } from "../src/config/llm.js";
import {
  analyzeWithLlm,
  runSemanticAnalysis,
  setSemanticAnalyzerForTests,
  type SemanticAnalysisInput,
} from "../src/agents/requirements/semantic-analyzer.js";
import { extractDeliverables } from "../src/agents/requirements/extract-deliverables.js";

const config: LlmConfig = {
  apiKey: "test-key",
  baseUrl: "https://llm.example/v1",
  model: "test-model",
};

const sampleInput: SemanticAnalysisInput = {
  parsedTexts: ["Deliverable: Configure SSO integration"],
  requirementsCanvasMarkdown: "# Requirements\n\n## Session Log\n",
  derivedComponents: ["IdentityNow"],
};

afterEach(() => {
  setSemanticAnalyzerForTests(null);
  vi.restoreAllMocks();
});

describe("analyzeWithLlm", () => {
  it("calls OpenAI-compatible chat completions endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              proposals: [{
                requirements: "Configure SSO integration",
                category: "SSO",
                sourceDocRef: "req.txt",
              }],
              outOfScope: [],
            }),
          },
        }],
      }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await analyzeWithLlm(sampleInput, config);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://llm.example/v1/chat/completions",
    );
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].requirements).toContain("Configure SSO");
  });
});

describe("runSemanticAnalysis", () => {
  it("uses injected analyzer in tests", async () => {
    const analyzer = vi.fn(async () => ({
      proposals: [{
        taskId: "TES-001",
        category: "Req",
        requirements: "From LLM",
        sourceDocRef: "doc",
        suggestedStatus: "Not started" as const,
      }],
      outOfScope: [],
    }));
    setSemanticAnalyzerForTests(analyzer);

    const result = await runSemanticAnalysis(sampleInput, config);

    expect(analyzer).toHaveBeenCalledTimes(1);
    expect(result.proposals[0].requirements).toBe("From LLM");
  });

  it("falls back to heuristic extraction when LLM returns empty", async () => {
    setSemanticAnalyzerForTests(async () => ({
      proposals: [],
      outOfScope: [],
    }));

    const result = await runSemanticAnalysis(sampleInput, config);

    expect(result.proposals.length).toBeGreaterThan(0);
    expect(result.proposals[0].requirements).toContain("Configure SSO");
  });
});
