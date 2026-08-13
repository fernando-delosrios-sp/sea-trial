import type { DeliverableProposal, DeliverableStatus } from "@sea-trial/shared/types/index.ts";

export interface DeliverableRowInput {
  taskId: string;
  assigneeId?: string;
  status: DeliverableStatus;
  situation: string;
  category: string;
  requirements: string;
  dueDate?: string;
  deliverableUrl?: string;
  openQuestions?: string;
}

/** Serializes proposal open questions for the list text column. */
export function formatOpenQuestions(questions?: string[]): string {
  return questions?.filter((q) => q.trim().length > 0).join("; ") ?? "";
}

export interface ListColumnMap {
  taskId: string;
  assignee: string;
  status: string;
  situation: string;
  category: string;
  requirements: string;
  dueDate: string;
  deliverable: string;
}

/**
 * Maps a deliverable proposal to list row field values.
 */
export function proposalToRowInput(
  proposal: DeliverableProposal,
  assigneeId?: string,
): DeliverableRowInput {
  return {
    taskId: proposal.taskId,
    assigneeId,
    status: proposal.suggestedStatus,
    situation: "New",
    category: proposal.category,
    requirements: proposal.requirements,
    dueDate: undefined,
    deliverableUrl: undefined,
    openQuestions: formatOpenQuestions(proposal.openQuestions),
  };
}

/**
 * Marks promoted candidates in Requirements canvas markdown.
 */
export function markPromotedInCanvas(
  canvasMarkdown: string,
  taskIds: string[],
): string {
  let updated = canvasMarkdown;
  for (const taskId of taskIds) {
    const pattern = new RegExp(
      `(\\*\\*${escapeRegex(taskId)}\\*\\*[^\\n]*)(\\s*\\[candidate\\])?`,
      "g",
    );
    updated = updated.replace(pattern, "$1 ✅ *promoted*");
  }
  return updated;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
