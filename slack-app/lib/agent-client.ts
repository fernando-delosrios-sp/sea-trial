import type {
  DeliverableProposal,
  ProcessRequirementsRequest,
  ProcessRequirementsResponse,
} from "@tes/shared/types/index.ts";

/**
 * Calls the agent-service Requirements Agent endpoint.
 * @param agentServiceUrl - Base URL of agent-service (no trailing slash)
 * @param request - Process request payload
 */
export async function callRequirementsAgent(
  agentServiceUrl: string,
  request: ProcessRequirementsRequest,
): Promise<ProcessRequirementsResponse> {
  const url = `${agentServiceUrl.replace(/\/$/, "")}/agents/requirements/process`;

  const body = {
    ...request,
    documents: request.documents.map((doc) => ({
      filename: doc.filename,
      mimeType: doc.mimeType,
      content: btoa(String.fromCharCode(...doc.content)),
    })),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    "Onboarding is not complete. Please click *Complete onboarding* in the pinned index message or run `/tes-onboard` before using the Requirements Agent."
  );
}
