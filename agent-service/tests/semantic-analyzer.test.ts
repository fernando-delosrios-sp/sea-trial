import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LlmConfig } from "../src/config/llm.js";
import {
  analyzeWithLlm,
  runSemanticAnalysis,
  setSemanticAnalyzerForTests,
  type SemanticAnalysisInput,
} from "../src/agents/requirements/semantic-analyzer.js";
import { extractDeliverables } from "../src/agents/requirements/extract-deliverables.js";
import {
  buildUpdatedCanvas,
  findSupersededDocuments,
  isDocumentRevision,
} from "../src/agents/requirements/graph.js";

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
    expect(result.proposals[0].requirements).toContain("[req.txt]");
    expect(result.proposals[0].provenanceTag).toBe("[req.txt]");
  });

  it("assembles multimodal image_url payloads in prompt", async () => {
    let capturedBody: any = null;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              proposals: [{
                requirements: "Extract diagram components",
                category: "Architecture",
                sourceDocRef: "diagram.png",
              }],
              outOfScope: [],
            }),
          },
        }],
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const inputWithImages: SemanticAnalysisInput = {
      ...sampleInput,
      parsedImages: [
        {
          dataBase64: "iVBORw0KGgoAAAANSUhEUg==",
          mimeType: "image/png",
          description: "System diagram",
        },
      ],
    };

    const result = await analyzeWithLlm(inputWithImages, config);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const messages = capturedBody.messages;
    expect(messages[0].content).toHaveLength(2);
    expect(messages[0].content[0].type).toBe("text");
    expect(messages[0].content[1].type).toBe("image_url");
    expect(messages[0].content[1].image_url.url).toContain("data:image/png;base64,");
    expect(result.proposals[0].provenanceTag).toBe("[diagram.png]");
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

describe("revision superseding and source provenance tagging", () => {
  it("detects document revisions by stem and version markers", () => {
    expect(isDocumentRevision("Architecture_v2.pdf", "Architecture_v1.pdf")).toBe(true);
    expect(isDocumentRevision("PRD-final-v2.docx", "PRD-final-v1.docx")).toBe(true);
    expect(isDocumentRevision("Other_spec.pdf", "Architecture_v1.pdf")).toBe(false);
  });

  it("identifies superseded documents in canvas markdown", () => {
    const canvasMarkdown = `
# Requirements
## Deliverable Candidates
- **TES-001** [candidate]: [Architecture_v1.pdf] Setup OAuth (Requirements)
- **TES-002** [candidate]: [PRD.docx] User roles (Requirements)
    `;
    const superseded = findSupersededDocuments(["Architecture_v2.pdf"], canvasMarkdown);
    expect(superseded).toEqual(["Architecture_v1.pdf"]);
  });

  it("removes superseded requirements from canvas markdown and applies revision", () => {
    const existingMarkdown = `# Requirements
## Deliverable Candidates
- **TES-001** [candidate]: [Architecture_v1.pdf] Setup OAuth (Requirements)
## Extracted Requirements
[Architecture_v1.pdf]
Old requirement details
`;
    const updated = buildUpdatedCanvas(
      existingMarkdown,
      [{ filename: "Architecture_v2.pdf", mimeType: "application/pdf", text: "New spec", supported: true }],
      ["[Architecture_v2.pdf]\nNew requirement details"],
      [{
        taskId: "TES-001",
        category: "Requirements",
        requirements: "[Architecture_v2.pdf] Setup OAuth 2.1",
        sourceDocRef: "Architecture_v2.pdf",
        provenanceTag: "[Architecture_v2.pdf]",
        suggestedStatus: "Not started",
      }],
      [],
      ["Architecture_v1.pdf"],
    );

    expect(updated).not.toContain("[Architecture_v1.pdf]");
    expect(updated).toContain("[Architecture_v2.pdf]");
    expect(updated).toContain("Setup OAuth 2.1");
  });
});
