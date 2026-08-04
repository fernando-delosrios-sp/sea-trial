import type { TesEventContext } from "@tes/shared/types/index.ts";

/**
 * Returns true when Requirements Agent invocation may proceed.
 */
export function shouldProceedWithAgent(context: TesEventContext | null): boolean {
  return context?.onboardingComplete === true;
}

/**
 * Returns true when a thread reply should re-invoke the agent.
 */
export function isThreadContinuation(
  messageTs: string,
  threadTs: string | undefined,
): boolean {
  return threadTs !== undefined && threadTs !== messageTs;
}
