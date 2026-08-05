import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestLogger } from "./logger.js";

export interface RequestContext {
  correlationId: string;
  logger: RequestLogger;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}
