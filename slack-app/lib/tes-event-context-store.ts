import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { TES_EVENT_CONTEXT_DATASTORE_NAME } from "../datastores/tes_event_context.ts";
import { deserializeEventContext, serializeEventContextSnapshot } from "./event-context.ts";

export const TES_EVENT_CONTEXT_STORE_MISS_ERROR =
  "This channel is not a TES Event Channel. Run Complete onboarding from a TES Event Channel, or re-run Create TES Event.";

export const TES_EVENT_CONTEXT_STORE_INVALID_ERROR =
  "TES Event Context Store row is missing or invalid. Re-run Create TES Event, or repair.";

export function tesEventContextStorePutError(detail?: string): string {
  const suffix = detail?.trim() ? `: ${detail.trim()}` : "";
  return `Failed to write TES Event Context Store${suffix}`;
}

export interface TesEventContextStoreClient {
  apps: {
    datastore: {
      get: (params: {
        datastore: string;
        id: string;
      }) => Promise<{
        ok?: boolean;
        error?: string;
        item?: { channel_id?: string; snapshot?: string };
      }>;
      put: (params: {
        datastore: string;
        item: { channel_id: string; snapshot: string };
      }) => Promise<{ ok?: boolean; error?: string }>;
    };
  };
}

function stripRetiredTriggerFields(context: TesEventContext): TesEventContext {
  const row = { ...context } as TesEventContext & {
    onboardingTriggerId?: string;
    onboardingLinkUrl?: string;
  };
  delete row.onboardingTriggerId;
  delete row.onboardingLinkUrl;
  return row;
}

/**
 * Loads TesEventContext for a channel ID.
 * @returns context on hit, null on miss — never reads canvas markdown
 */
export async function getTesEventContext(
  client: TesEventContextStoreClient,
  channelId: string,
): Promise<TesEventContext | null> {
  const response = await client.apps.datastore.get({
    datastore: TES_EVENT_CONTEXT_DATASTORE_NAME,
    id: channelId,
  });

  if (response.ok === false) {
    throw new Error(
      tesEventContextStorePutError(response.error).replace(
        "write TES Event Context Store",
        "read TES Event Context Store",
      ),
    );
  }

  const snapshot = response.item?.snapshot?.trim();
  if (!snapshot) return null;

  const context = deserializeEventContext(snapshot);
  if (!context) {
    throw new Error(TES_EVENT_CONTEXT_STORE_INVALID_ERROR);
  }

  return stripRetiredTriggerFields(context);
}

/** Writes compact TesEventContext JSON for the channel. Fails clearly when put is not ok. */
export async function putTesEventContext(
  client: TesEventContextStoreClient,
  context: TesEventContext,
): Promise<void> {
  const channelId = context.channelId?.trim();
  if (!channelId) {
    throw new Error(tesEventContextStorePutError("channel ID is missing"));
  }

  const response = await client.apps.datastore.put({
    datastore: TES_EVENT_CONTEXT_DATASTORE_NAME,
    item: {
      channel_id: channelId,
      snapshot: serializeEventContextSnapshot(stripRetiredTriggerFields(context)),
    },
  });

  if (response.ok === false) {
    throw new Error(tesEventContextStorePutError(response.error));
  }
}
