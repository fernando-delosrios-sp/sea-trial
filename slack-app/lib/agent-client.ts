import type {
  DeliverableProposal,
  DeliveryConsolidationRequest,
  DeliveryConsolidationResponse,
  FilePayload,
  ProcessRequirementsRequest,
  ProcessRequirementsResponse,
  TesEventContext,
} from "@sea-trial/shared/types/index.ts";
import type { DocumentInput } from "@sea-trial/shared/types/index.ts";
import { CORRELATION_ID_HEADER } from "@sea-trial/observability/index.js";

export function encodeFilePayload(content: Uint8Array): string {
  let binary = "";
  for (const byte of content) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Builds the HTTP JSON body sent to agent-service (raw bytes as FilePayload[]).
 */
export function buildAgentHttpBody(request: ProcessRequirementsRequest): {
  context: TesEventContext;
  requirementsCanvasMarkdown: string;
  existingDeliverables: DeliverableProposal[];
  files: FilePayload[];
  threadHistory?: string;
} {
  const files: FilePayload[] = request.documents.map((doc) => ({
    filename: doc.filename,
    mimeType: doc.mimeType,
    contentBase64: encodeFilePayload(doc.content),
  }));

  return {
    context: request.context,
    requirementsCanvasMarkdown: request.requirementsCanvasMarkdown,
    existingDeliverables: request.existingDeliverables,
    files,
    threadHistory: request.threadHistory,
  };
}

/**
 * Builds the agent process request from Slack invoke inputs.
 */
export function buildInvokeAgentRequest(
  context: TesEventContext,
  requirementsCanvasMarkdown: string,
  documents: DocumentInput[],
  threadHistory?: string,
): ProcessRequirementsRequest {
  return {
    context,
    requirementsCanvasMarkdown,
    existingDeliverables: [],
    documents,
    threadHistory,
  };
}

/**
 * Resolves the agent-service base URL from deploy environment variables.
 * @throws Error when AGENT_SERVICE_URL is missing or empty
 */
export function resolveAgentServiceUrl(
  env: Record<string, string | undefined>,
): string {
  const url = env["AGENT_SERVICE_URL"]?.trim();
  if (!url) {
    throw new Error(
      "AGENT_SERVICE_URL is required. Set it via GitHub Actions deploy or slack env set.",
    );
  }
  return url;
}

/**
 * Calls the agent-service Requirements Agent endpoint.
 * @param agentServiceUrl - Base URL of agent-service (no trailing slash)
 * @param request - Process request payload
 */
export async function callRequirementsAgent(
  agentServiceUrl: string,
  request: ProcessRequirementsRequest,
  correlationId?: string,
): Promise<ProcessRequirementsResponse> {
  const url = `${agentServiceUrl.replace(/\/$/, "")}/agents/requirements/process`;

  const body = buildAgentHttpBody(request);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (correlationId) {
    headers[CORRELATION_ID_HEADER] = correlationId;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Agent service error (${response.status}): ${errorText}`,
    );
  }

  return await response.json() as ProcessRequirementsResponse;
}

/**
 * Calls the agent-service Delivery consolidation endpoint.
 */
export async function callDeliveryAgent(
  agentServiceUrl: string,
  request: DeliveryConsolidationRequest,
  correlationId?: string,
): Promise<DeliveryConsolidationResponse> {
  const url = `${agentServiceUrl.replace(/\/$/, "")}/agents/delivery/consolidate`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (correlationId) {
    headers[CORRELATION_ID_HEADER] = correlationId;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Delivery agent error (${response.status}): ${errorText}`,
    );
  }

  return await response.json() as DeliveryConsolidationResponse;
}

/**
 * Builds Block Kit blocks for a deliverable proposal with Accept/Edit/Reject actions.
 */
export function buildProposalBlocks(
  proposals: DeliverableProposal[],
  threadTs: string,
): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Requirements Agent* proposes ${proposals.length} deliverable(s):`,
      },
    },
  ];

  for (const proposal of proposals) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `*${proposal.taskId}* — ${proposal.category}`,
          proposal.requirements,
          proposal.similarityNotes
            ? `_Similarity: ${proposal.similarityNotes}_`
            : "",
          proposal.openQuestions?.length
            ? `_Questions: ${proposal.openQuestions.join("; ")}_`
            : "",
        ].filter(Boolean).join("\n"),
      },
    });
  }

  blocks.push({
    type: "actions",
    block_id: `proposal_actions_${threadTs}`,
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "Accept" },
        style: "primary",
        action_id: "accept_proposals",
        value: threadTs,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Edit" },
        action_id: "edit_proposals",
        value: threadTs,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Reject" },
        style: "danger",
        action_id: "reject_proposals",
        value: threadTs,
      },
    ],
  });

  return blocks;
}

/**
 * Returns a gate message when onboarding is incomplete.
 */
export function onboardingGateMessage(): string {
  return (
    "Onboarding is not complete. Click *Complete onboarding* in the pinned index message before @mentioning the bot with documents."
  );
}


