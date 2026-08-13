import type { DeliveryConsolidationRequest } from "@sea-trial/shared";
import { runDeliveryConsolidation } from "./consolidate.js";

export function runDeliveryGraph(
  request: DeliveryConsolidationRequest,
) {
  return runDeliveryConsolidation(request);
}
