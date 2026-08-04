import type { DeliverableProposal, DeliverableStatus } from "@tes/shared/types/index.ts";

export interface DeliverableRowInput {
  taskId: string;
  assigneeId?: string;
  status: DeliverableStatus;
  situation: string;
  category: string;
  requirements: string;
  dueDate?: string;
  deliverableUrl?: string;
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

/**
 * Builds delivery template canvas content from proposal and requirements excerpt.
 */
export function buildDeliveryTemplateContent(
  proposal: DeliverableProposal,
  requirementsExcerpt: string,
): string {
  return [
    `# Delivery Template: ${proposal.taskId}`,
    "",
    "## Category",
    proposal.category,
    "",
    "## Requirements",
    proposal.requirements,
    "",
    "## Source Reference",
    proposal.sourceDocRef,
    "",
    "## Requirements Canvas Excerpt",
    requirementsExcerpt,
    "",
    "## Status",
    proposal.suggestedStatus,
  ].join("\n");
}
