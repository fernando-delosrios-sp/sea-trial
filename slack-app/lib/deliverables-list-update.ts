import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { toSlackListSelectValue } from "./content/slack-list-schema.ts";
import { getListFieldChangeRules } from "./content/list-compiler.ts";
import {
  ensureDeliveryCanvasForValidationRequired,
  type DeliveryCanvasOrchestratorClient,
  type EnsureDeliveryCanvasParams,
} from "./delivery-canvas-orchestrator.ts";
import { shouldCreateDeliveryCanvas } from "./delivery-canvas.ts";
import { matchFieldChangeFunctions } from "./list-field-change.ts";

export interface DeliverableListItemSnapshot {
  taskId: string;
  assigneeId?: string;
  status: string;
  situation: string;
  category: string;
  requirements: string;
  openQuestions?: string;
  deliverableUrl?: string;
}

export interface DispatchFieldChangeParams {
  listName: string;
  column: string;
  previousValue: string;
  newValue: string;
  row: DeliverableListItemSnapshot;
}

/** Resolves field_change function names for a declarative list update. */
export function resolveFieldChangeDispatch(
  params: DispatchFieldChangeParams,
): string[] {
  if (params.previousValue === params.newValue) return [];
  const rules = getListFieldChangeRules(params.listName);
  return matchFieldChangeFunctions(rules, params.column, params.newValue);
}

/** Returns true when Validation required should create a delivery canvas. */
export function shouldRunValidationRequiredHandler(
  dispatch: DispatchFieldChangeParams,
): boolean {
  return resolveFieldChangeDispatch(dispatch).includes("on_validation_required") &&
    shouldCreateDeliveryCanvas(dispatch.newValue, dispatch.row.deliverableUrl);
}

export interface RunValidationRequiredParams {
  client: DeliveryCanvasOrchestratorClient;
  channelId: string;
  listId: string;
  listItemId?: string;
  context: TesEventContext;
  row: DeliverableListItemSnapshot;
  env: Record<string, string | undefined>;
  correlationId?: string;
}

/** Runs Validation required delivery canvas creation when applicable. */
export async function runValidationRequiredIfNeeded(
  dispatch: DispatchFieldChangeParams,
  params: RunValidationRequiredParams,
) {
  if (!shouldRunValidationRequiredHandler(dispatch)) {
    return null;
  }

  const ensureParams: EnsureDeliveryCanvasParams = {
    channelId: params.channelId,
    listId: params.listId,
    listItemId: params.listItemId,
    context: params.context,
    row: {
      taskId: params.row.taskId,
      assigneeId: params.row.assigneeId,
      status: params.row.status,
      situation: params.row.situation,
      category: params.row.category,
      requirements: params.row.requirements,
      openQuestions: params.row.openQuestions,
      deliverableUrl: params.row.deliverableUrl,
    },
    env: params.env,
    correlationId: params.correlationId,
  };

  return await ensureDeliveryCanvasForValidationRequired(
    params.client,
    ensureParams,
  );
}

export interface UpdateDeliverableStatusClient extends DeliveryCanvasOrchestratorClient {
  slackLists: DeliveryCanvasOrchestratorClient["slackLists"] & {
    items: {
      update: (params: {
        list_id: string;
        item_id: string;
        fields: Array<{ column_id: string; value: string }>;
      }) => Promise<unknown>;
    };
  };
}

export interface UpdateDeliverableStatusParams {
  client: UpdateDeliverableStatusClient;
  channelId: string;
  listId: string;
  listItemId: string;
  context: TesEventContext;
  row: DeliverableListItemSnapshot;
  newStatus: string;
  env: Record<string, string | undefined>;
}

/** App-initiated status update with declarative field_change dispatch. */
export async function updateDeliverableStatus(
  params: UpdateDeliverableStatusParams,
) {
  const previousStatus = params.row.status;

  await params.client.slackLists.items.update({
    list_id: params.listId,
    item_id: params.listItemId,
    fields: [{ column_id: "status", value: toSlackListSelectValue(params.newStatus) }],
  });

  const updatedRow = { ...params.row, status: params.newStatus };
  const canvasResult = await runValidationRequiredIfNeeded(
    {
      listName: "deliverables",
      column: "status",
      previousValue: previousStatus,
      newValue: params.newStatus,
      row: updatedRow,
    },
    {
      client: params.client,
      channelId: params.channelId,
      listId: params.listId,
      listItemId: params.listItemId,
      context: params.context,
      row: updatedRow,
      env: params.env,
    },
  );

  return {
    previousStatus,
    newStatus: params.newStatus,
    canvasResult,
  };
}
