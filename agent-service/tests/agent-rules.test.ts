import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { ProcessRequirementsRequest, TesEventContext } from "@sea-trial/shared";
import { NO_EXTRACTABLE_TEXT_ERROR } from "../src/parsers/index.js";
import {
  analyzeRequirements,
  buildDocumentsProcessedSection,
  buildUpdatedCanvas,
  clarifyOrPropose,
  extractDeliverables,
  formatOutput,
  loadContext,
  parseDocuments,
  runRequirementsAgent,
  validateLlmConfig,
} from "../src/agents/requirements/graph.js";
import { setSemanticAnalyzerForTests } from "../src/agents/requirements/semantic-analyzer.js";

const baseContext: TesEventContext = {
  channelId: "C1",
  projectName: "Acme",
  onboardingComplete: true,
  derivedComponents: ["IdentityNow", "Access Management"],
  dashboardCanvasId: "d1",
  requirementsCanvasId: "r1",
  deliverablesListId: "l1",
  incidentsListId: "l2",
  infrastructureCanvasId: "i1",
            situationReportCanvasId: "sr1",
};

function makeRequest(
  overrides: Partial<ProcessRequirementsRequest> = {},
): ProcessRequirementsRequest {
  return {
    context: baseContext,
    requirementsCanvasMarkdown: "# Requirements\n\n## Session Log\n",
    existingDeliverables: [],
    documents: [],
    ...overrides,
  };
}

describe("no-merge rule", () => {
  it("returns two separate proposals for two explicit deliverables", () => {
    const text = [
      "Deliverable: Configure SSO with Okta",
      "Deliverable: Build access certification campaign",
    ].join("\n");

    const { proposals } = extractDeliverables([text], baseContext.derivedComponents);
    expect(proposals.length).toBe(2);
    expect(proposals[0].taskId).not.toBe(proposals[1].taskId);
  });
});

describe("out-of-scope rejection", () => {
  it("flags SAP requirements as out of scope", () => {
    const text = "Implement SAP HR connector integration";
    const { outOfScope } = extractDeliverables([text], baseContext.derivedComponents);
    expect(outOfScope.length).toBe(1);
  });
});

describe("clarification path", () => {
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

  it("returns needsClarification when no documents parsed", async () => {
    const state = loadContext(makeRequest());
    const afterAnalyze = await analyzeRequirements(state);
    const result = clarifyOrPropose(afterAnalyze);

    expect(result.needsClarification).toBe(true);
    expect(result.clarificationQuestions?.length).toBeGreaterThan(0);
  });
});

describe("second session extends canvas", () => {
  it("session log counts provided documents, not extracted text snippets", () => {
    const existing = "# Requirements\n";
    const parsedDocuments = [
      {
        filename: "empty.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        text: "",
        supported: false,
        error: NO_EXTRACTABLE_TEXT_ERROR,
      },
      {
        filename: "bad.png",
        mimeType: "image/png",
        text: "",
        supported: false,
        error: "Unsupported format: .png",
      },
    ];
    const updated = buildUpdatedCanvas(existing, parsedDocuments, [], [], []);

    expect(updated).toMatch(/Processed 2 document\(s\)/);
  });

  it("does not infer document count from parsedTexts when no documents provided", () => {
    const existing = "# Requirements\n";
    const updated = buildUpdatedCanvas(existing, [], ["orphan text snippet"], [], []);

    expect(updated).toMatch(/Processed 0 document\(s\)/);
  });

  it("preserves prior session log entries", () => {
    const existing = "# Requirements\n\n## Session Log\n- **2026-01-01:** First session.\n";
    const parsedDocuments = [{
      filename: "new.txt",
      mimeType: "text/plain",
      text: "New doc content",
      supported: true,
    }];
    const updated = buildUpdatedCanvas(
      existing,
      parsedDocuments,
      ["New doc content"],
      [{
        taskId: "TES-001",
        category: "Req",
        requirements: "New item",
        sourceDocRef: "doc",
        suggestedStatus: "Not started",
      }],
      [],
    );

    expect(updated).toContain("First session");
    expect(updated).toContain("TES-001");
    expect(updated).toContain("## Documents processed");
  });

  it("replaces Out of Scope section instead of duplicating header", () => {
    const existing =
      "# Requirements\n\n## Out of Scope\n- SAP HR connector integration\n";
    const updated = buildUpdatedCanvas(
      existing,
      [],
      [],
      [],
      ["Legacy mainframe connector"],
    );

    expect((updated.match(/## Out of Scope/g) ?? []).length).toBe(1);
    expect(updated).toContain("Legacy mainframe connector");
    expect(updated).not.toContain("SAP HR connector integration");
  });

  it("replaces Documents processed section content on subsequent runs", () => {
    const existing =
      "# Requirements\n\n## Documents processed\n- **old.pdf** (application/pdf): parsed successfully\n";
    const parsedDocuments = [{
      filename: "new.pdf",
      mimeType: "application/pdf",
      text: "content",
      supported: true,
    }];
    const updated = buildUpdatedCanvas(
      existing,
      parsedDocuments,
      ["content"],
      [],
      [],
    );

    expect(updated).toContain("new.pdf");
    expect(updated).not.toContain("old.pdf");
    expect((updated.match(/## Documents processed/g) ?? []).length).toBe(1);
  });

  it("replaces Deliverable Candidates section content on subsequent runs", () => {
    const existing =
      "# Requirements\n\n## Deliverable Candidates\n- **TES-001** [candidate]: Old item (Req)\n";
    const updated = buildUpdatedCanvas(
      existing,
      [],
      ["text"],
      [{
        taskId: "TES-002",
        category: "Req",
        requirements: "New item",
        sourceDocRef: "doc",
        suggestedStatus: "Not started",
      }],
      [],
    );

    expect(updated).toContain("TES-002");
    expect(updated).not.toContain("TES-001");
    expect((updated.match(/## Deliverable Candidates/g) ?? []).length).toBe(1);
  });

  it("appends Out of Scope section on first run", () => {
    const existing = "# Requirements\n\n## Session Log\n";
    const updated = buildUpdatedCanvas(
      existing,
      [],
      [],
      [],
      ["SAP HR connector integration"],
    );

    expect(updated).toContain("## Out of Scope");
    expect(updated).toContain("SAP HR connector integration");
    expect((updated.match(/## Out of Scope/g) ?? []).length).toBe(1);
  });
});

describe("runRequirementsAgent", () => {
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

  it("processes documents and returns proposals", async () => {
    const content = new TextEncoder().encode(
      "Deliverable: Configure IdentityNow SSO\nDeliverable: Set up certification campaign",
    );

    const response = await runRequirementsAgent(makeRequest({
      documents: [{
        filename: "req.txt",
        mimeType: "text/plain",
        content,
      }],
    }));

    expect(response.proposals.length).toBe(2);
    expect(response.needsClarification).toBe(false);
    expect(response.canvasMarkdown).toContain("TES-001");
  });
});

describe("validateLlmConfig", () => {
  it("throws when LLM_API_KEY is missing", () => {
    delete process.env.LLM_API_KEY;
    expect(() => validateLlmConfig()).toThrow("LLM_API_KEY");
  });
});

describe("parseDocuments", () => {
  it("extracts text from uploaded documents", async () => {
    const documents = [{
      filename: "req.txt",
      mimeType: "text/plain",
      content: new TextEncoder().encode("Deliverable: Test item"),
    }];
    const state = loadContext(makeRequest({ documents }));

    const updated = await parseDocuments(state, documents);
    expect(updated.parsedTexts.length).toBe(1);
    expect(updated.parsedDocuments.length).toBe(1);
  });

  it("reports empty documents as parse failures in clarifyOrPropose", () => {
    const parsedDocuments = [{
      filename: "empty.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      text: "",
      supported: false,
      error: NO_EXTRACTABLE_TEXT_ERROR,
    }];
    const state = {
      ...loadContext(makeRequest()),
      parsedDocuments,
      parsedTexts: [],
    };

    const clarified = clarifyOrPropose(state);
    expect(clarified.needsClarification).toBe(true);
    expect(clarified.clarificationQuestions?.[0]).toContain("empty.docx");
    expect(clarified.clarificationQuestions?.[0]).toContain(NO_EXTRACTABLE_TEXT_ERROR);

    const section = buildDocumentsProcessedSection(parsedDocuments);
    expect(section).toContain("empty.docx");
    expect(section).not.toContain("parsed successfully");
    expect(section).toContain(NO_EXTRACTABLE_TEXT_ERROR);
  });
});

describe("documents processed section", () => {
  it("lists parse status per file", () => {
    const section = buildDocumentsProcessedSection([
      {
        filename: "ok.txt",
        mimeType: "text/plain",
        text: "content",
        supported: true,
      },
      {
        filename: "bad.png",
        mimeType: "image/png",
        text: "",
        supported: false,
        error: "Unsupported format: .png",
      },
    ]);

    expect(section).toContain("ok.txt");
    expect(section).toContain("parsed successfully");
    expect(section).toContain("bad.png");
    expect(section).toContain("Unsupported");
  });
});

describe("formatOutput", () => {
  it("updates canvas with documents processed section", () => {
    const state = loadContext(makeRequest());
    const withParsed = {
      ...state,
      parsedDocuments: [{
        filename: "req.txt",
        mimeType: "text/plain",
        text: "Deliverable: Item",
        supported: true,
      }],
      parsedTexts: ["Deliverable: Item"],
      proposals: [{
        taskId: "TES-001",
        category: "Req",
        requirements: "Item",
        sourceDocRef: "doc",
        suggestedStatus: "Not started",
      }],
      needsClarification: false,
      agentMessage: "Done",
    };

    const result = formatOutput(withParsed);
    expect(result.requirementsCanvasMarkdown).toContain("Documents processed");
  });
});

describe("no external memory dependency", () => {
  it("agent-service package has no vector store dependencies", async () => {
    const pkg = await import("../package.json", { with: { type: "json" } });
    const deps = {
      ...pkg.default.dependencies,
      ...pkg.default.devDependencies,
    };
    const depNames = Object.keys(deps).join(" ").toLowerCase();
    expect(depNames).not.toContain("qdrant");
    expect(depNames).not.toContain("supermemory");
    expect(depNames).not.toContain("gbrain");
  });
});

