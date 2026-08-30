import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import {
  grantCompleteOnboardingToChannel,
  requireCompleteOnboardingTriggerId,
  type CompleteOnboardingGrantClient,
} from "./complete-onboarding-grant.ts";
import {
  putTesEventContext,
  type TesEventContextStoreClient,
} from "./tes-event-context-store.ts";

export interface TesEventContextRepairClient
  extends TesEventContextStoreClient, CompleteOnboardingGrantClient {}

/** Puts a store row and grants the global shortcut. Creates no per-channel trigger. */
export async function repairTesEventChannel(
  client: TesEventContextRepairClient,
  context: TesEventContext,
  env?: Record<string, string | undefined>,
): Promise<void> {
  await putTesEventContext(client, context);
  await grantCompleteOnboardingToChannel(
    client,
    requireCompleteOnboardingTriggerId(env),
    context.channelId,
  );
}
