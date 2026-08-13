import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type {
  DeliverableProposal,
  ParsedDocument,
  ProcessRequirementsRequest,
  ProcessRequirementsResponse,
  TesEventContext,
} from "@sea-trial/shared";
import { getLlmConfig } from "../../config/llm.js";
import { getRequestContext } from "../../observability/request-context.js";
import {
  analyzeRequirements,
  clarifyOrPropose,
  formatOutput,
  loadContext,
  parseDocuments,
  type AgentState,
} from "./graph.js";

const AgentGraphState = Annotation.Root({
  context: Annotation<TesEventContext>,
  requirementsCanvasMarkdown: Annotation<string>,
  existingDeliverables: Annotation<DeliverableProposal[]>,
  parsedDocuments: Annotation<ParsedDocument[]>,
  parsedTexts: Annotation<string[]>,
  proposals: Annotation<DeliverableProposal[]>,
  agentMessage: Annotation<string>,
  needsClarification: Annotation<boolean>,
  needsClarificationFlag: Annotation<boolean>,
  clarificationQuestions: Annotation<string[]>,
  outOfScopeItems: Annotation<string[]>,
  documents: Annotation<ProcessRequirementsRequest["documents"]>,
});

type GraphState = typeof AgentGraphState.State;

function toAgentState(state: GraphState): AgentState {
  return {
    context: state.context,
    requirementsCanvasMarkdown: state.requirementsCanvasMarkdown,
    existingDeliverables: state.existingDeliverables,
    parsedDocuments: state.parsedDocuments ?? [],
    parsedTexts: state.parsedTexts ?? [],
    proposals: state.proposals ?? [],
    agentMessage: state.agentMessage ?? "",
    needsClarification: state.needsClarification ?? false,
    clarificationQuestions: state.clarificationQuestions ?? [],
    outOfScopeItems: state.outOfScopeItems ?? [],
  };
}

function fromAgentState(state: GraphState, agent: AgentState): GraphState {
  return {
    ...state,
    ...agent,
    needsClarification: agent.needsClarification,
  };
}

/**
 * LangGraph.js Requirements Agent — loadContext → parseDocuments →
 * analyzeRequirements → clarifyOrPropose → formatOutput.
 */
export function createRequirementsGraph() {
  const graph = new StateGraph(AgentGraphState)
    .addNode("loadContext", (state: GraphState) => {
      const agent = loadContext({
        context: state.context,
        requirementsCanvasMarkdown: state.requirementsCanvasMarkdown,
        existingDeliverables: state.existingDeliverables,
        documents: state.documents ?? [],
      });
      return fromAgentState(state, agent);
    })
    .addNode("parseDocuments", async (state: GraphState) => {
      const agent = await parseDocuments(toAgentState(state), state.documents ?? []);
      return fromAgentState(state, agent);
    })
    .addNode("analyzeRequirements", async (state: GraphState) => {
      const agent = await analyzeRequirements(toAgentState(state));
      return fromAgentState(state, agent);
    })
    .addNode("clarifyOrPropose", (state: GraphState) => {
      const agent = clarifyOrPropose(toAgentState(state));
      return fromAgentState(state, agent);
    })
    .addNode("formatOutput", (state: GraphState) => {
      const agent = formatOutput(toAgentState(state));
      return fromAgentState(state, agent);
    })
    .addEdge(START, "loadContext")
    .addEdge("loadContext", "parseDocuments")
    .addEdge("parseDocuments", "analyzeRequirements")
    .addEdge("analyzeRequirements", "clarifyOrPropose")
    .addEdge("clarifyOrPropose", "formatOutput")
    .addEdge("formatOutput", END);

  return graph.compile();
}

/**
 * Runs the LangGraph Requirements Agent pipeline.
 */
export async function runRequirementsGraph(
  request: ProcessRequirementsRequest,
): Promise<ProcessRequirementsResponse> {
  getLlmConfig();
  const compiled = createRequirementsGraph();
  const result = await compiled.invoke({
    context: request.context,
    requirementsCanvasMarkdown: request.requirementsCanvasMarkdown,
    existingDeliverables: request.existingDeliverables,
    documents: request.documents,
    parsedDocuments: [],
    parsedTexts: [],
    proposals: [],
    agentMessage: "",
    needsClarification: false,
    needsClarificationFlag: false,
    clarificationQuestions: [],
    outOfScopeItems: [],
  });

  const ctx = getRequestContext();
  ctx?.logger.emit("documents.parsed", {
    files: (result.parsedDocuments ?? []).map((doc) => ({
      filename: doc.filename,
      mimeType: doc.mimeType,
      supported: doc.supported,
      error: doc.error,
    })),
  });

  return {
    canvasMarkdown: result.requirementsCanvasMarkdown,
    proposals: result.proposals ?? [],
    agentMessage: result.agentMessage ?? "",
    needsClarification: result.needsClarification ?? false,
    clarificationQuestions: result.clarificationQuestions,
  };
}

