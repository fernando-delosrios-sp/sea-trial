import type { DeliveryConsolidationRequest } from "@tes-event-process/shared";
import { runDeliveryConsolidation } from "./consolidate.js";

export function runDeliveryGraph(
  request: DeliveryConsolidationRequest,
) {
  return runDeliveryConsolidation(request);
}
