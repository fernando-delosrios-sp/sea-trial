import type {
  DeliveryConsolidationRequest,
  TesEventContext,
} from "@sea-trial/shared/types/index.ts";
import {
  callDeliveryAgent,
  resolveAgentServiceUrl,
} from "./agent-client.ts";
import { createCanvas, readCanvasMarkdown, replaceCanvasContent } from "./canvas.ts";
import {
  formatCanvasDeliverableRef,
  type DeliverableListRowForDelivery,
} from "./delivery-canvas.ts";
import {
  injectDeliveryCanvasActions,
  type DeliveryCanvasActionContext,
} from "./delivery-canvas-actions.ts";
import type { CanvasEditClient, CanvasSectionsClient, SlackCanvasClient } from "./canvas.ts";

export type DeliveryCanvasEditClient = CanvasEditClient & CanvasSectionsClient;

export interface DeliveryCanvasOrchestratorClient extends SlackCanvasClient {
  slackLists?: {
    items?: {
      update?: (params: {
        list_id: string;
        item_id: string;
        fields: Array<{ column_id: string; value: string }>;
      }) => Promise<unknown>;
    };
  };
}

export interface EnsureDeliveryCanvasParams {
  channelId: string;
  listId: string;
  listItemId?: string;
  context: TesEventContext;
  row: DeliverableListRowForDelivery;
  env: Record<string, string | undefined>;
  correlationId?: string;
}

export interface EnsureDeliveryCanvasResult {
  canvasId: string;
  canvasMarkdown: string;
  created: boolean;
}

function buildActionContext(
  params: EnsureDeliveryCanvasParams,
  canvasId: string,
): DeliveryCanvasActionContext {
  return {
    teamId: params.env["SLACK_TEAM_ID"]?.trim(),
    channelId: params.channelId,
    canvasId,
    taskId: params.row.taskId,
    dashboardCanvasId: params.context.dashboardCanvasId,
  };
}

async function consolidateViaAgent(
  request: DeliveryConsolidationRequest,
  env: Record<string, string | undefined>,
  correlationId?: string,
): Promise<string> {
  const agentUrl = resolveAgentServiceUrl(env);
  const response = await callDeliveryAgent(agentUrl, request, correlationId);
  return response.canvasMarkdown;
}

function buildConsolidationRequest(
  params: EnsureDeliveryCanvasParams,
  existingMarkdown?: string,
): DeliveryConsolidationRequest {
  return {
    context: params.context,
    row: {
      taskId: params.row.taskId,
      assigneeId: params.row.assigneeId,
      assigneeDisplay: params.row.assigneeDisplay,
      status: params.row.status,
      situation: params.row.situation,
      category: params.row.category,
      requirements: params.row.requirements,
      openQuestions: params.row.openQuestions,
    },
    canvasMarkdown: existingMarkdown,
  };
}

/**
 * Creates or updates a Delivery Template Canvas when status is Validation required.
 * Canvas titles are disambiguated with `-1`, `-2`, … suffixes on workspace name collision.
 */
export async function ensureDeliveryCanvasForValidationRequired(
  client: DeliveryCanvasOrchestratorClient,
  params: EnsureDeliveryCanvasParams,
): Promise<EnsureDeliveryCanvasResult> {
  const existingCanvasId = params.row.deliverableUrl?.startsWith("canvas:")
    ? params.row.deliverableUrl.slice("canvas:".length)
    : null;

  let existingMarkdown: string | undefined;
  if (existingCanvasId) {
    try {
      existingMarkdown = await readCanvasMarkdown(client, existingCanvasId);
    } catch {
      existingMarkdown = undefined;
    }
  }

  let canvasMarkdown = await consolidateViaAgent(
    buildConsolidationRequest(params, existingMarkdown),
    params.env,
    params.correlationId,
  );

  if (existingCanvasId) {
    canvasMarkdown = injectDeliveryCanvasActions(
      canvasMarkdown,
      buildActionContext(params, existingCanvasId),
    );
    await replaceCanvasContent(client, existingCanvasId, canvasMarkdown);
    return {
      canvasId: existingCanvasId,
      canvasMarkdown,
      created: false,
    };
  }

  const canvasId = await createCanvas(client, {
    channelId: params.channelId,
    title: `Delivery: ${params.row.taskId}`,
    content: canvasMarkdown,
  });

  canvasMarkdown = injectDeliveryCanvasActions(
    canvasMarkdown,
    buildActionContext(params, canvasId),
  );
  await replaceCanvasContent(client, canvasId, canvasMarkdown);

  if (params.listItemId && client.slackLists?.items?.update) {
    await client.slackLists.items.update({
      list_id: params.listId,
      item_id: params.listItemId,
      fields: [{
        column_id: "deliverable",
        value: formatCanvasDeliverableRef(canvasId),
      }],
    });
  }

  return { canvasId, canvasMarkdown, created: true };
}

/** Re-consolidates an existing delivery canvas. */
export async function consolidateDeliveryCanvas(
  client: DeliveryCanvasEditClient,
  params: EnsureDeliveryCanvasParams & { canvasId: string },
): Promise<string> {
  let existingMarkdown = "";
  try {
    existingMarkdown = await readCanvasMarkdown(client, params.canvasId);
  } catch {
    existingMarkdown = "";
  }

  let canvasMarkdown = await consolidateViaAgent(
    buildConsolidationRequest(params, existingMarkdown),
    params.env,
    params.correlationId,
  );

  canvasMarkdown = injectDeliveryCanvasActions(
    canvasMarkdown,
    buildActionContext(params, params.canvasId),
  );
  await replaceCanvasContent(client, params.canvasId, canvasMarkdown);
  return canvasMarkdown;
}
