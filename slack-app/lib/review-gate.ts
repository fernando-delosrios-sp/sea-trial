import type { DeliverableProposal } from "@sea-trial/shared/types/index.ts";
import { replaceCanvasContent, type CanvasEditClient } from "./canvas.ts";
import {
  markPromotedInCanvas,
  proposalToRowInput,
  type DeliverableRowInput,
} from "./deliverables.ts";

export type ReviewAction =
  | "accept_proposals"
  | "reject_proposals"
  | "edit_proposals"
  | "none";

/**
 * Normalizes a Block Kit action_id to a review action.
 */
export function resolveReviewAction(actionId: string): ReviewAction {
  if (
    actionId === "accept_proposals" ||
    actionId === "reject_proposals" ||
    actionId === "edit_proposals"
  ) {
    return actionId;
  }
  return "none";
}

/**
 * Returns true only when the action should create Deliverables List rows.
 */
export function shouldWriteToList(action: ReviewAction): boolean {
  return action === "accept_proposals";
}

export interface ListRowFields {
  taskId: string;
  requirement_ref: string;
  assignee: string;
  status: string;
  situation: string;
  category: string;
  requirements: string;
  deliverable: string;
  openQuestions: string;
}

/**
 * Builds list row field values for an accepted proposal.
 */
export function buildListRowFields(
  row: DeliverableRowInput,
  userId: string,
): ListRowFields {
  return {
    taskId: row.taskId,
    requirement_ref: row.requirement_ref ?? "",
    assignee: row.assigneeId ?? userId,
    status: row.status,
    situation: row.situation,
    category: row.category,
    requirements: row.requirements,
    deliverable: "",
    openQuestions: row.openQuestions ?? "",
  };
}

export interface AcceptProcessingResult {
  rows: ListRowFields[];
  promotedTaskIds: string[];
  updatedCanvasMarkdown: string;
}

/**
 * Pure accept-path processing: rows and canvas promotion (no delivery canvas).
 */
export function processAcceptProposals(
  proposals: DeliverableProposal[],
  requirementsCanvasMarkdown: string,
  userId: string,
): AcceptProcessingResult {
  const rows: ListRowFields[] = [];
  const promotedTaskIds: string[] = [];

  for (const proposal of proposals) {
    const row = proposalToRowInput(proposal, userId);
    rows.push(buildListRowFields(row, userId));
    promotedTaskIds.push(proposal.taskId);
  }

  return {
    rows,
    promotedTaskIds,
    updatedCanvasMarkdown: markPromotedInCanvas(
      requirementsCanvasMarkdown,
      promotedTaskIds,
    ),
  };
}

/**
 * User-facing message for each review action outcome.
 */
export function reviewActionMessage(action: ReviewAction, count: number): string {
  switch (action) {
    case "accept_proposals":
      return `✅ Accepted ${count} deliverable(s). Delivery canvas will be created when status reaches Validation required.`;
    case "reject_proposals":
      return "Proposals rejected. No deliverables were added to the list.";
    case "edit_proposals":
      return "Reply in this thread with your edits; the agent will re-process with your changes.";
    default:
      return "No action taken. Deliverables list unchanged.";
  }
}

export interface HandleAcceptProposalActionParams {
  client: {
    canvases?: {
      edit?: (params: unknown) => Promise<unknown>;
    };
    chat?: {
      update?: (params: Record<string, unknown>) => Promise<unknown>;
      postMessage: (params: Record<string, unknown>) => Promise<unknown>;
    };
  };
  channelId: string;
  messageTs?: string;
  threadTs: string;
  requirementsCanvasId?: string;
  proposedMarkdown: string;
}

/**
 * Handles user acceptance of a staged requirements proposal,
 * applying proposed markdown to the Requirements Canvas and updating the message.
 */
export async function handleAcceptProposalAction(
  params: HandleAcceptProposalActionParams,
): Promise<{ ok: boolean }> {
  if (params.requirementsCanvasId && params.client.canvases?.edit) {
    await replaceCanvasContent(
      params.client as unknown as CanvasEditClient,
      params.requirementsCanvasId,
      params.proposedMarkdown,
    );
  }

  const confirmationText =
    "✅ Requirements proposal accepted and Requirements Canvas updated.";

  if (params.client.chat?.update && params.messageTs) {
    await params.client.chat.update({
      channel: params.channelId,
      ts: params.messageTs,
      text: confirmationText,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `✅ *Requirements proposal accepted.* The Requirements Canvas has been updated.`,
          },
        },
      ],
    });
  } else if (params.client.chat?.postMessage) {
    await params.client.chat.postMessage({
      channel: params.channelId,
      thread_ts: params.threadTs,
      text: confirmationText,
    });
  }

  return { ok: true };
}
