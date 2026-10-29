import type {
  DeliverableProposal,
  DocumentImagePayload,
  ParsedDocument,
  ProcessRequirementsRequest,
  ProcessRequirementsResponse,
  RequirementsProposal,
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
  parsedImages: DocumentImagePayload[];
  proposals: DeliverableProposal[];
  agentMessage: string;
  needsClarification: boolean;
  clarificationQuestions: string[];
  outOfScopeItems: string[];
  proposal?: RequirementsProposal;
  supersededRequirementRefs?: string[];
}

/**
 * Normalizes document base name without version suffixes to detect revisions.
 */
export function getDocumentStem(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
  return nameWithoutExt
    .replace(/[-_]v?\d+(\.\d+)?$/i, "")
    .replace(/[-_](draft|rev\d+|revision\d+|final)$/i, "")
    .toLowerCase();
}

/**
 * Determines whether two filenames represent revisions of the same underlying specification.
 */
export function isDocumentRevision(
  uploadedFilename: string,
  existingSourceFilename: string,
): boolean {
  if (uploadedFilename.toLowerCase() === existingSourceFilename.toLowerCase()) {
    return true;
  }
  const stem1 = getDocumentStem(uploadedFilename);
  const stem2 = getDocumentStem(existingSourceFilename);
  return stem1.length > 0 && stem1 === stem2;
}

/**
 * Identifies document names in existing canvas requirements that are superseded by new uploads.
 */
export function findSupersededDocuments(
  currentFilenames: string[],
  existingMarkdown: string,
): string[] {
  const superseded = new Set<string>();
  const tagRegex = /\[([A-Za-z0-9_.-]+\.[A-Za-z0-9]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(existingMarkdown)) !== null) {
    const existingDoc = match[1];
    for (const currentFile of currentFilenames) {
      if (
        isDocumentRevision(currentFile, existingDoc) &&
        currentFile.toLowerCase() !== existingDoc.toLowerCase()
      ) {
        superseded.add(existingDoc);
      }
    }
  }
  return Array.from(superseded);
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
    parsedImages: [],
    proposals: [],
    agentMessage: "",
    needsClarification: false,
    clarificationQuestions: [],
    outOfScopeItems: [],
    supersededRequirementRefs: [],
  };
}

/**
 * Parses all uploaded documents without invoking an LLM, gathering texts and image buffers.
 */
export async function parseDocuments(
  state: AgentState,
  documents: ProcessRequirementsRequest["documents"],
): Promise<AgentState> {
  const parsedDocuments: ParsedDocument[] = [];
  const parsedTexts: string[] = [];
  const parsedImages: DocumentImagePayload[] = [];

  for (const doc of documents) {
    const result = await parseDocument({
      filename: doc.filename,
      mimeType: doc.mimeType,
      content: doc.content,
    });

    parsedDocuments.push(result);

    if (result.supported) {
      if (result.text) {
        parsedTexts.push(`[${result.filename}]\n${result.text}`);
      }
      if (result.images && result.images.length > 0) {
        for (const img of result.images) {
          parsedImages.push(img);
        }
      }
    }
  }

  return { ...state, parsedDocuments, parsedTexts, parsedImages };
}

/**
 * Analyzes parsed text and visual payloads via LLM semantic extraction,
 * detecting document revisions and formatting source provenance tags.
 */
export async function analyzeRequirements(
  state: AgentState,
): Promise<AgentState> {
  const config = getLlmConfig();
  const currentFilenames = state.parsedDocuments
    .filter((d) => d.supported)
    .map((d) => d.filename);

  const supersededRequirementRefs = findSupersededDocuments(
    currentFilenames,
    state.requirementsCanvasMarkdown,
  );

  const { proposals, outOfScope } = await runSemanticAnalysis(
    {
      parsedTexts: state.parsedTexts,
      parsedImages: state.parsedImages,
      requirementsCanvasMarkdown: state.requirementsCanvasMarkdown,
      derivedComponents: state.context.derivedComponents,
    },
    config,
  );

  return {
    ...state,
    proposals,
    outOfScopeItems: outOfScope,
    supersededRequirementRefs,
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

  const supersededNote = state.supersededRequirementRefs?.length
    ? `\n\n🔄 *Supersedes requirements from:* ${state.supersededRequirementRefs.join(", ")}`
    : "";

  return {
    ...state,
    agentMessage:
      `Extracted ${state.proposals.length} deliverable proposal(s). Review and Accept/Reject below.${scopeNote}${supersededNote}`,
    needsClarification: false,
  };
}

/**
 * Formats output including Requirements Canvas updates and staged RequirementsProposal.
 */
export function formatOutput(state: AgentState): AgentState {
  const currentFilenames = state.parsedDocuments
    .filter((d) => d.supported)
    .map((d) => d.filename);

  const supersededDocs = state.supersededRequirementRefs ?? [];

  const canvasMarkdown = buildUpdatedCanvas(
    state.requirementsCanvasMarkdown,
    state.parsedDocuments,
    state.parsedTexts,
    state.proposals,
    state.outOfScopeItems,
    supersededDocs,
  );

  const proposalSummary = [
    `Proposed ${state.proposals.length} requirement deliverable(s) from ${currentFilenames.join(", ") || "uploaded documents"}.`,
    supersededDocs.length > 0
      ? `Supersedes previous requirements from: ${supersededDocs.join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const proposal: RequirementsProposal = {
    summary: proposalSummary,
    sourceFiles: currentFilenames,
    candidateDeliverables: state.proposals,
    proposedCanvasMarkdown: canvasMarkdown,
    supersededRequirementRefs: supersededDocs,
  };

  return {
    ...state,
    requirementsCanvasMarkdown: canvasMarkdown,
    proposal,
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
 * Builds updated Requirements canvas markdown preserving prior content
 * and removing items superseded by revisions.
 */
export function buildUpdatedCanvas(
  existingMarkdown: string,
  parsedDocuments: ParsedDocument[],
  parsedTexts: string[],
  proposals: DeliverableProposal[],
  outOfScope: string[],
  supersededDocs: string[] = [],
): string {
  let cleanedMarkdown = existingMarkdown;
  if (supersededDocs.length > 0) {
    for (const doc of supersededDocs) {
      const tag = `[${doc}]`;
      cleanedMarkdown = cleanedMarkdown
        .split("\n")
        .filter((line) => !line.includes(tag))
        .join("\n");
    }
  }

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

  let updated = cleanedMarkdown;

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
    proposal: state.proposal,
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


