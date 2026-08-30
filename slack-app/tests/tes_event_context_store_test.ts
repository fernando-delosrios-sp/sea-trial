import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { TES_EVENT_CONTEXT_DATASTORE_NAME } from "../datastores/tes_event_context.ts";
import { serializeEventContextSnapshot } from "../lib/event-context.ts";
import {
  getTesEventContext,
  putTesEventContext,
  TES_EVENT_CONTEXT_STORE_INVALID_ERROR,
  tesEventContextStorePutError,
  type TesEventContextStoreClient,
} from "../lib/tes-event-context-store.ts";

const baseContext: TesEventContext = {
  channelId: "C123",
  projectName: "Acme",
  onboardingComplete: false,
  derivedComponents: [],
  dashboardCanvasId: "dash1",
  requirementsCanvasId: "req1",
  deliverablesListId: "list1",
  incidentsListId: "list2",
  infrastructureCanvasId: "infra1",
  situationReportCanvasId: "sr1",
};

function storeClient(options?: {
  get?: TesEventContextStoreClient["apps"]["datastore"]["get"];
  put?: TesEventContextStoreClient["apps"]["datastore"]["put"];
}) {
  const items = new Map<string, string>();
  const puts: Array<{ datastore: string; item: { channel_id: string; snapshot: string } }> = [];
  const gets: string[] = [];

  const client: TesEventContextStoreClient = {
    apps: {
      datastore: {
        get: async (params) => {
          gets.push(params.id);
          if (options?.get) return options.get(params);
          const snapshot = items.get(params.id);
          if (!snapshot) return { ok: true, item: undefined };
          return {
            ok: true,
            item: { channel_id: params.id, snapshot },
          };
        },
        put: async (params) => {
          puts.push(params);
          if (options?.put) return options.put(params);
          items.set(params.item.channel_id, params.item.snapshot);
          return { ok: true };
        },
      },
    },
  };

  return { client, items, puts, gets };
}

Deno.test("TES Event Context Store round-trips compact TesEventContext", async () => {
  const { client, puts } = storeClient();
  await putTesEventContext(client, baseContext);
  const loaded = await getTesEventContext(client, "C123");

  assertEquals(puts[0]?.datastore, TES_EVENT_CONTEXT_DATASTORE_NAME);
  assertEquals(puts[0]?.item.channel_id, "C123");
  assertEquals(JSON.parse(puts[0]?.item.snapshot ?? "{}"), baseContext);
  assertEquals(loaded, baseContext);
});

Deno.test("TES Event Context Store miss returns null without canvas read", async () => {
  const { client, gets } = storeClient();
  const loaded = await getTesEventContext(client, "C-missing");
  assertEquals(loaded, null);
  assertEquals(gets, ["C-missing"]);
});

Deno.test("TES Event Context Store bad JSON fails with repair error", async () => {
  const { client } = storeClient({
    get: async () => ({ ok: true, item: { channel_id: "C123", snapshot: "{not-json" } }),
  });
  await assertRejects(
    () => getTesEventContext(client, "C123"),
    Error,
    TES_EVENT_CONTEXT_STORE_INVALID_ERROR,
  );
});

Deno.test("TES Event Context Store put failure is clear", async () => {
  const { client } = storeClient({
    put: async () => ({ ok: false, error: "restricted_action" }),
  });
  await assertRejects(
    () => putTesEventContext(client, baseContext),
    Error,
    tesEventContextStorePutError("restricted_action"),
  );
});

Deno.test("TES Event Context Store snapshot omits retired trigger fields", async () => {
  const { client, puts } = storeClient();
  await putTesEventContext(client, {
    ...baseContext,
    onboardingTriggerId: "FtOLD",
    onboardingLinkUrl: "https://slack.com/shortcuts/FtOLD/secret",
  } as TesEventContext);
  const stored = JSON.parse(puts[0]?.item.snapshot ?? "{}") as Record<string, unknown>;
  assertEquals(stored.onboardingTriggerId, undefined);
  assertEquals(stored.onboardingLinkUrl, undefined);
  assertEquals(serializeEventContextSnapshot({
    ...baseContext,
    onboardingTriggerId: "FtOLD",
    onboardingLinkUrl: "https://example.test",
  } as TesEventContext).includes("onboardingTriggerId"), false);
});
