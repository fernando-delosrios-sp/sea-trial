import type {
  DeliverableProposal,
  ProcessRequirementsRequest,
  ProcessRequirementsResponse,
  TesEventContext,
} from "@tes-event-process/shared";
import { parseDocument } from "../../parsers/index.js";
import { getLlmConfig } from "../../config/llm.js";

export interface AgentState {
  context: TesEventContext;
  requirementsCanvasMarkdown: string;
  existingDeliverables: DeliverableProposal[];
  parsedTexts: string[];
  proposals: DeliverableProposal[];
  agentMessage: string;
  needsClarification: boolean;
  clarificationQuestions: string[];
  outOfScopeItems: string[];
}

/**
 * Loads context from the request into agent state.
 */
export function loadContext(
  request: ProcessRequirementsRequest,
): AgentState {
  return {
    context: request.context,
    requirementsCanvasMarkdown: request.requirementsCanvasMarkdown,
    existingDeliverables: request.existingDeliverables,
    parsedTexts: [],
    proposals: [],
    agentMessage: "",
    needsClarification: false,
    clarificationQuestions: [],
    outOfScopeItems: [],
  };
}

/**
 * Parses all uploaded documents in the request.
 */
export async function parseDocuments(
  state: AgentState,
  documents: ProcessRequirementsRequest["documents"],
): Promise<AgentState> {
  const parsedTexts: string[] = [];

  for (const doc of documents) {
    const result = await parseDocument({
      filename: doc.filename,
      mimeType: doc.mimeType,
      content: doc.content,
    });

    if (result.supported && result.text) {
      parsedTexts.push(`[${result.filename}]\n${result.text}`);
    }
  }

  return { ...state, parsedTexts };
}

const DELIVERABLE_PATTERN =
  /(?:deliverable|requirement|task|scope)[:\s]+(.+)/gi;

/**
 * Extracts explicit deliverables from parsed text without merging distinct items.
 */
export function extractDeliverables(
  texts: string[],
  derivedComponents: string[],
): { proposals: DeliverableProposal[]; outOfScope: string[] } {
  const proposals: DeliverableProposal[] = [];
  const outOfScope: string[] = [];
  let taskCounter = 1;

  for (const text of texts) {
    const lines = text.split("\n").filter((l) => l.trim().length > 10);

    for (const line of lines) {
      const isOutOfScope = !derivedComponents.some((c) =>
        line.toLowerCase().includes(c.toLowerCase())
      ) && derivedComponents.length > 0 && line.includes("SAP");

      if (isOutOfScope) {
        outOfScope.push(line.trim());
        continue;
      }

      if (
        line.toLowerCase().includes("deliverable") ||
        line.toLowerCase().includes("implement") ||
        line.toLowerCase().includes("configure")
      ) {
        proposals.push({
          taskId: `TES-${String(taskCounter++).padStart(3, "0")}`,
          category: "Requirements",
          requirements: line.trim(),
          sourceDocRef: text.slice(0, 50),
          suggestedStatus: "Not started",
        });
      }
    }
  }

  return { proposals, outOfScope };
}

/**
 * Analyzes requirements and produces deliverable proposals.
 */
export function analyzeRequirements(state: AgentState): AgentState {
  const { proposals, outOfScope } = extractDeliverables(
    state.parsedTexts,
    state.context.derivedComponents,
  );

  return {
    ...state,
    proposals,
    outOfScopeItems: outOfScope,
  };
}

/**
 * Determines whether clarification is needed or produces final proposals.
 */
export function clarifyOrPropose(state: AgentState): AgentState {
  if (state.parsedTexts.length === 0) {
    return {
      ...state,
      needsClarification: true,
      clarificationQuestions: [
        "No readable content was found in the uploaded documents. Please upload PDF, DOCX, XLSX, or text files with explicit requirements.",
      ],
      agentMessage: "I need more information to extract requirements.",
    };
  }

  if (state.proposals.length === 0) {
    return {
      ...state,
      needsClarification: true,
      clarificationQuestions: [
        "I could not identify explicit deliverables. Can you clarify the scope and list distinct deliverables?",
      ],
      agentMessage: "I need clarification on the deliverables.",
    };
  }

  const canvasMarkdown = buildUpdatedCanvas(
    state.requirementsCanvasMarkdown,
    state.parsedTexts,
    state.proposals,
    state.outOfScopeItems,
  );

  const scopeNote = state.outOfScopeItems.length
    ? `\n\n⚠️ *Out of scope:* ${state.outOfScopeItems.join("; ")}`
    : "";

  return {
    ...state,
    requirementsCanvasMarkdown: canvasMarkdown,
    agentMessage:
      `Extracted ${state.proposals.length} deliverable proposal(s). Review and Accept/Reject below.${scopeNote}`,
    needsClarification: false,
  };
}

/**
 * Builds updated Requirements canvas markdown preserving prior content.
 */
export function buildUpdatedCanvas(
  existingMarkdown: string,
  parsedTexts: string[],
  proposals: DeliverableProposal[],
  outOfScope: string[],
): string {
  const timestamp = new Date().toISOString();
  const sessionEntry = `\n- **${timestamp}:** Processed ${parsedTexts.length} document(s), found ${proposals.length} candidate(s).`;

  const candidatesSection = proposals
    .map(
      (p) =>
        `- **${p.taskId}** [candidate]: ${p.requirements} (${p.category})`,
    )
    .join("\n");

  const extractedSection = parsedTexts
    .map((t) => t.slice(0, 500))
    .join("\n\n---\n\n");

  let updated = existingMarkdown;

  if (updated.includes("## Session Log")) {
    updated = updated.replace(
      "## Session Log",
      `## Session Log${sessionEntry}\n`,
    );
  } else {
    updated += `\n\n## Session Log${sessionEntry}`;
  }

  if (candidatesSection) {
    if (updated.includes("## Deliverable Candidates")) {
      updated = updated.replace(
        "## Deliverable Candidates",
        `## Deliverable Candidates\n${candidatesSection}\n`,
      );
    } else {
      updated += `\n\n## Deliverable Candidates\n${candidatesSection}`;
    }
  }

  if (extractedSection) {
    if (updated.includes("## Extracted Requirements")) {
      updated = updated.replace(
        "## Extracted Requirements",
        `## Extracted Requirements\n${extractedSection}\n`,
      );
    } else {
      updated += `\n\n## Extracted Requirements\n${extractedSection}`;
    }
  }

  if (outOfScope.length) {
    updated += `\n\n## Out of Scope\n${outOfScope.map((o) => `- ${o}`).join("\n")}`;
  }

  return updated;
}

/**
 * Runs the full Requirements Agent pipeline.
 */
export async function runRequirementsAgent(
  request: ProcessRequirementsRequest,
): Promise<ProcessRequirementsResponse> {
  let state = loadContext(request);
  state = await parseDocuments(state, request.documents);
  state = analyzeRequirements(state);
  state = clarifyOrPropose(state);

  return {
    canvasMarkdown: state.requirementsCanvasMarkdown,
    proposals: state.proposals,
    agentMessage: state.agentMessage,
    needsClarification: state.needsClarification,
    clarificationQuestions: state.clarificationQuestions,
  };
}

/**
 * Validates LLM configuration is present.
 */
export function validateLlmConfig(): void {
  getLlmConfig();
}
