import type { DeliverableProposal } from "@sea-trial/shared/types/index.ts";
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
