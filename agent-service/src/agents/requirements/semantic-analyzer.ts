import type { DeliverableProposal } from "@tes-event-process/shared";
import type { LlmConfig } from "../../config/llm.js";
import { extractDeliverables } from "./extract-deliverables.js";

export interface SemanticAnalysisInput {
  parsedTexts: string[];
  requirementsCanvasMarkdown: string;
  derivedComponents: string[];
}

export interface SemanticAnalysisResult {
  proposals: DeliverableProposal[];
  outOfScope: string[];
}

export type SemanticAnalyzer = (
  input: SemanticAnalysisInput,
  config: LlmConfig,
) => Promise<SemanticAnalysisResult>;

let analyzerOverride: SemanticAnalyzer | null = null;

/** Test hook — inject a mock LLM analyzer. */
export function setSemanticAnalyzerForTests(
  analyzer: SemanticAnalyzer | null,
): void {
  analyzerOverride = analyzer;
}

/**
 * Calls an OpenAI-compatible chat completion for semantic requirement extraction.
 */
export async function analyzeWithLlm(
  input: SemanticAnalysisInput,
  config: LlmConfig,
): Promise<SemanticAnalysisResult> {
  const documentText = input.parsedTexts.join("\n\n");
  const prompt = [
    "Extract distinct deliverable proposals from the uploaded documents.",
    "Do not merge separate deliverables.",
    `In-scope components: ${input.derivedComponents.join(", ") || "none specified"}`,
    "Flag requirements outside scope (e.g. unrelated platforms) in outOfScope.",
    "",
    "Requirements canvas context:",
    input.requirementsCanvasMarkdown,
    "",
    "Parsed documents:",
    documentText,
    "",
    'Respond with JSON: {"proposals":[{"requirements":"...","category":"...","sourceDocRef":"..."}],"outOfScope":["..."]}',
  ].join("\n");

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed (${response.status})`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty response");
  }

  const parsed = JSON.parse(content) as {
    proposals?: Array<{
      requirements: string;
      category?: string;
      sourceDocRef?: string;
    }>;
    outOfScope?: string[];
  };

  const proposals: DeliverableProposal[] = (parsed.proposals ?? []).map(
    (item, index) => ({
      taskId: `TES-${String(index + 1).padStart(3, "0")}`,
      category: item.category ?? "Requirements",
      requirements: item.requirements,
      sourceDocRef: item.sourceDocRef ?? documentText.slice(0, 50),
      suggestedStatus: "Not started" as const,
    }),
  );

  return {
    proposals,
    outOfScope: parsed.outOfScope ?? [],
  };
}

/**
 * Runs semantic analysis via injected test analyzer or production LLM call.
 * Falls back to heuristic extraction when the LLM response is empty.
 */
export async function runSemanticAnalysis(
  input: SemanticAnalysisInput,
  config: LlmConfig,
): Promise<SemanticAnalysisResult> {
  const analyzer = analyzerOverride ?? analyzeWithLlm;

  try {
    const result = await analyzer(input, config);
    if (result.proposals.length > 0 || result.outOfScope.length > 0) {
      return result;
    }
  } catch {
    // Fall through to heuristic extraction on LLM failure.
  }

  return extractDeliverables(input.parsedTexts, input.derivedComponents);
}
