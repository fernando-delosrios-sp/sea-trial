import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type {
  DeliverableProposal,
  ProcessRequirementsRequest,
  ProcessRequirementsResponse,
  TesEventContext,
} from "@tes-event-process/shared";
import { getLlmConfig } from "../../config/llm.js";
import {
  analyzeRequirements,
  clarifyOrPropose,
  loadContext,
  parseDocuments,
  type AgentState,
} from "./graph.js";

const AgentGraphState = Annotation.Root({
  context: Annotation<TesEventContext>,
  requirementsCanvasMarkdown: Annotation<string>,
  existingDeliverables: Annotation<DeliverableProposal[]>,
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
 * LangGraph.js Requirements Agent — wraps loadContext → parseDocuments →
 * analyzeRequirements → clarifyOrPropose as a StateGraph pipeline.
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
    .addNode("analyzeRequirements", (state: GraphState) => {
      const agent = analyzeRequirements(toAgentState(state));
      return fromAgentState(state, agent);
    })
    .addNode("clarifyOrPropose", (state: GraphState) => {
      const agent = clarifyOrPropose(toAgentState(state));
      return fromAgentState(state, agent);
    })
    .addEdge(START, "loadContext")
    .addEdge("loadContext", "parseDocuments")
    .addEdge("parseDocuments", "analyzeRequirements")
    .addEdge("analyzeRequirements", "clarifyOrPropose")
    .addEdge("clarifyOrPropose", END);

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
    parsedTexts: [],
    proposals: [],
    agentMessage: "",
    needsClarification: false,
    needsClarificationFlag: false,
    clarificationQuestions: [],
    outOfScopeItems: [],
  });

  return {
    canvasMarkdown: result.requirementsCanvasMarkdown,
    proposals: result.proposals ?? [],
    agentMessage: result.agentMessage ?? "",
    needsClarification: result.needsClarification ?? false,
    clarificationQuestions: result.clarificationQuestions,
  };
}
