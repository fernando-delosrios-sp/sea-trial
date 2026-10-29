import type { DeliverableProposal, DocumentImagePayload } from "@sea-trial/shared";
import type { LlmConfig } from "../../config/llm.js";
import { extractDeliverables } from "./extract-deliverables.js";

export interface SemanticAnalysisInput {
  parsedTexts: string[];
  parsedImages?: DocumentImagePayload[];
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
 * Calls an OpenAI-compatible chat completion for semantic requirement extraction,
 * supporting multimodal image payloads alongside text.
 */
export async function analyzeWithLlm(
  input: SemanticAnalysisInput,
  config: LlmConfig,
): Promise<SemanticAnalysisResult> {
  const documentText = input.parsedTexts.join("\n\n");
  const prompt = [
    "Extract distinct deliverable proposals from the uploaded documents and visual figures/pages.",
    "Do not merge separate deliverables.",
    `In-scope components: ${input.derivedComponents.join(", ") || "none specified"}`,
    "Flag requirements outside scope (e.g. unrelated platforms) in outOfScope.",
    "Prefix each requirement with its document source provenance tag in brackets: e.g. [filename.ext] Requirement description.",
    "",
    "Requirements canvas context:",
    input.requirementsCanvasMarkdown,
    "",
    "Parsed documents:",
    documentText,
    "",
    'Respond with JSON: {"proposals":[{"requirements":"[filename.ext] ...","category":"...","sourceDocRef":"filename.ext"}],"outOfScope":["..."]}',
  ].join("\n");

  const messageContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: prompt }];

  if (input.parsedImages && input.parsedImages.length > 0) {
    for (const img of input.parsedImages) {
      const dataUrl = img.dataBase64
        ? `data:${img.mimeType};base64,${img.dataBase64}`
        : img.buffer
          ? `data:${img.mimeType};base64,${Buffer.from(img.buffer).toString("base64")}`
          : "";
      if (dataUrl) {
        messageContent.push({
          type: "image_url",
          image_url: { url: dataUrl },
        });
      }
    }
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: messageContent }],
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
    (item, index) => {
      const sourceDoc = item.sourceDocRef ?? "document";
      const tag = `[${sourceDoc}]`;
      const req = item.requirements.startsWith("[")
        ? item.requirements
        : `${tag} ${item.requirements}`;

      return {
        taskId: `TES-${String(index + 1).padStart(3, "0")}`,
        category: item.category ?? "Requirements",
        requirements: req,
        sourceDocRef: sourceDoc,
        provenanceTag: tag,
        suggestedStatus: "Not started" as const,
      };
    },
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
