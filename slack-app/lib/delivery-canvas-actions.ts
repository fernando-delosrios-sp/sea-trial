import type { TesEventContext } from "@sea-trial/shared/types/index.ts";

export interface DeliveryCanvasActionContext {
  teamId?: string;
  channelId: string;
  canvasId: string;
  taskId: string;
  dashboardCanvasId: string;
}

/** Machine-readable delivery canvas action payload (embedded in canvas markdown). */
export function buildDeliveryCanvasActionsComment(
  context: DeliveryCanvasActionContext,
): string {
  return `<!-- tes-delivery-actions: ${JSON.stringify({
    consolidate: "consolidate_delivery",
    mark_reviewed: "mark_delivery_reviewed",
    canvas_id: context.canvasId,
    task_id: context.taskId,
    channel_id: context.channelId,
    dashboard_canvas_id: context.dashboardCanvasId,
  })} -->`;
}

/** Human-visible action labels referencing app function callback IDs. */
export function buildDeliveryCanvasActionsBlock(
  context: DeliveryCanvasActionContext,
): string {
  const canvasUrl = context.teamId
    ? `https://app.slack.com/docs/${context.teamId}/${context.canvasId}`
    : `#delivery-${context.taskId}`;
  return [
    `> **Actions:**`,
    `> · **Consolidate draft** — invoke \`consolidate_delivery\` for \`${context.taskId}\``,
    `> · **Mark reviewed** — invoke \`mark_delivery_reviewed\` for \`${context.taskId}\``,
    `> · **Open canvas:** [Delivery: ${context.taskId}](${canvasUrl})`,
    buildDeliveryCanvasActionsComment(context),
  ].join("\n");
}

/** Replaces placeholder Actions block with function-linked metadata. */
export function injectDeliveryCanvasActions(
  markdown: string,
  context: DeliveryCanvasActionContext,
): string {
  const block = buildDeliveryCanvasActionsBlock(context);
  const actionsPattern =
    /> \*\*Actions:\*\*[\s\S]*?(?=\n---|\n## |$)/;

  if (actionsPattern.test(markdown)) {
    return markdown.replace(actionsPattern, block);
  }

  const titleMatch = markdown.match(/^# Delivery:[^\n]+\n\n/);
  if (titleMatch) {
    const insertAt = titleMatch[0].length;
    return markdown.slice(0, insertAt) + block + "\n\n" + markdown.slice(insertAt);
  }

  return `${markdown.trimEnd()}\n\n${block}\n`;
}

/** Parses tes-delivery-actions comment from canvas markdown. */
export function parseDeliveryCanvasActionsComment(
  markdown: string,
): Record<string, string> | null {
  const match = markdown.match(/<!-- tes-delivery-actions: (\{[\s\S]*?\}) -->/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as Record<string, string>;
  } catch {
    return null;
  }
}
