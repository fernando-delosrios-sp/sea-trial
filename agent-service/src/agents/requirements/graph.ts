import type {
  DeliverableProposal,
  ParsedDocument,
  ProcessRequirementsRequest,
  ProcessRequirementsResponse,
  TesEventContext,
} from "@sea-trial/shared";
import { parseDocument } from "../../parsers/index.js";
import { getLlmConfig } from "../../config/llm.js";
import { runSemanticAnalysis } from "./semantic-analyzer.js";
import { extractDeliverables } from "./extract-deliverables.js";

export { extractDeliverables };

export interface AgentState {
  context: TesEventContext;
  requirementsCanvasMarkdown: string;
  existingDeliverables: DeliverableProposal[];
  parsedDocuments: ParsedDocument[];
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
    parsedDocuments: [],
    parsedTexts: [],
    proposals: [],
    agentMessage: "",
    needsClarification: false,
    clarificationQuestions: [],
    outOfScopeItems: [],
  };
}

/**
 * Parses all uploaded documents without invoking an LLM.
 */
export async function parseDocuments(
  state: AgentState,
  documents: ProcessRequirementsRequest["documents"],
): Promise<AgentState> {
  const parsedDocuments: ParsedDocument[] = [];
  const parsedTexts: string[] = [];

  for (const doc of documents) {
    const result = await parseDocument({
      filename: doc.filename,
      mimeType: doc.mimeType,
      content: doc.content,
    });

    parsedDocuments.push(result);

    if (result.supported && result.text) {
      parsedTexts.push(`[${result.filename}]\n${result.text}`);
    }
  }

  return { ...state, parsedDocuments, parsedTexts };
}


/**
 * Analyzes parsed text via LLM semantic extraction (no format parsing).
 */
export async function analyzeRequirements(
  state: AgentState,
): Promise<AgentState> {
  const config = getLlmConfig();
  const { proposals, outOfScope } = await runSemanticAnalysis(
    {
      parsedTexts: state.parsedTexts,
      requirementsCanvasMarkdown: state.requirementsCanvasMarkdown,
      derivedComponents: state.context.derivedComponents,
    },
    config,
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
  if (state.parsedTexts.length === 0 && state.parsedDocuments.length > 0) {
    const errors = state.parsedDocuments
      .filter((d) => !d.supported)
      .map((d) => `${d.filename}: ${d.error ?? "unsupported"}`);

    return {
      ...state,
      needsClarification: true,
      clarificationQuestions: errors.length
        ? [`Could not parse uploaded files: ${errors.join("; ")}`]
        : [
          "No readable content was found in the uploaded documents. Please upload PDF, DOCX, XLSX, or text files with explicit requirements.",
        ],
      agentMessage: "I need more information to extract requirements.",
    };
  }

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

  const scopeNote = state.outOfScopeItems.length
    ? `\n\n⚠️ *Out of scope:* ${state.outOfScopeItems.join("; ")}`
    : "";

  return {
    ...state,
    agentMessage:
      `Extracted ${state.proposals.length} deliverable proposal(s). Review and Accept/Reject below.${scopeNote}`,
    needsClarification: false,
  };
}

/**
 * Formats output including Requirements Canvas updates.
 */
export function formatOutput(state: AgentState): AgentState {
  const canvasMarkdown = buildUpdatedCanvas(
    state.requirementsCanvasMarkdown,
    state.parsedDocuments,
    state.parsedTexts,
    state.proposals,
    state.outOfScopeItems,
  );

  return {
    ...state,
    requirementsCanvasMarkdown: canvasMarkdown,
  };
}

/**
 * Builds the "Documents processed" section lines from parse results.
 */
export function buildDocumentsProcessedSection(
  parsedDocuments: ParsedDocument[],
): string {
  if (parsedDocuments.length === 0) {
    return "";
  }

  const lines = parsedDocuments.map((doc) => {
    if (doc.supported) {
      return `- **${doc.filename}** (${doc.mimeType}): parsed successfully`;
    }
    return `- **${doc.filename}** (${doc.mimeType}): ${doc.error ?? "unsupported"}`;
  });

  return lines.join("\n");
}

/**
 * Replaces an entire canvas section (header through the next ## header or EOF),
 * or appends the section when the header is not present.
 */
export function replaceOrAppendCanvasSection(
  markdown: string,
  header: string,
  body: string,
): string {
  const headerLine = header.startsWith("## ") ? header : `## ${header}`;
  const escapedHeader = headerLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionRegex = new RegExp(
    `^${escapedHeader}\\n[\\s\\S]*?(?=\\n## |$)`,
    "m",
  );
  const section = body ? `${headerLine}\n${body}\n` : `${headerLine}\n`;

  if (sectionRegex.test(markdown)) {
    return markdown.replace(sectionRegex, section);
  }

  return `${markdown.trimEnd()}\n\n${section}`;
}

/**
 * Builds updated Requirements canvas markdown preserving prior content.
 */
export function buildUpdatedCanvas(
  existingMarkdown: string,
  parsedDocuments: ParsedDocument[],
  parsedTexts: string[],
  proposals: DeliverableProposal[],
  outOfScope: string[],
): string {
  const timestamp = new Date().toISOString();
  const sessionEntry = `\n- **${timestamp}:** Processed ${parsedDocuments.length} document(s), found ${proposals.length} candidate(s).`;

  const documentsSection = buildDocumentsProcessedSection(parsedDocuments);

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

  if (documentsSection) {
    updated = replaceOrAppendCanvasSection(
      updated,
      "## Documents processed",
      documentsSection,
    );
  }

  if (candidatesSection) {
    updated = replaceOrAppendCanvasSection(
      updated,
      "## Deliverable Candidates",
      candidatesSection,
    );
  }

  if (extractedSection) {
    updated = replaceOrAppendCanvasSection(
      updated,
      "## Extracted Requirements",
      extractedSection,
    );
  }

  if (outOfScope.length) {
    const outOfScopeSection = outOfScope.map((o) => `- ${o}`).join("\n");
    updated = replaceOrAppendCanvasSection(
      updated,
      "## Out of Scope",
      outOfScopeSection,
    );
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
  state = await analyzeRequirements(state);
  state = clarifyOrPropose(state);
  state = formatOutput(state);

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


