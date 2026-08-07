import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@tes/shared/types/index.ts";
import {
  applySlotIds,
  getContextFieldForSlot,
  loadComposition,
  parseCompositionJson,
  resolveProvisioningOrder,
  resetCompositionCacheForTests,
} from "../lib/content/composition-resolver.ts";
import {
  isKindProvisionable,
  loadKindDefinition,
  resetKindCacheForTests,
} from "../lib/content/kind-registry.ts";
import { provisionChannel } from "../lib/content/channel-provisioner.ts";
import {
  renderPinnedIndexMessage,
  resetMessageCacheForTests,
} from "../lib/content/message-renderer.ts";

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
};

Deno.test("tes-event composition manifest loads and validates", () => {
  resetCompositionCacheForTests();
  const composition = loadComposition("tes-event");
  assertEquals(composition.channel_type, "tes-event");
  assertEquals(composition.version, "1.0.0");
  assertEquals(composition.resources.length, 5);
  assertEquals(
    getContextFieldForSlot(composition, "dashboard"),
    "dashboardCanvasId",
  );
});

Deno.test("composition provisioning order respects depends_on", () => {
  const composition = loadComposition("tes-event");
  const ordered = resolveProvisioningOrder(composition.resources);
  const slots = ordered.map((entry) => entry.slot);

  assertEquals(slots.indexOf("dashboard"), slots.length - 1);
  assertEquals(slots.indexOf("requirements") < slots.indexOf("dashboard"), true);
  assertEquals(slots.indexOf("deliverables") < slots.indexOf("dashboard"), true);
});

Deno.test("composition rejects cyclic depends_on", () => {
  assertThrows(
    () =>
      resolveProvisioningOrder([
        { slot: "a", kind: "canvas", ref: "a", depends_on: ["b"] },
        { slot: "b", kind: "canvas", ref: "b", depends_on: ["a"] },
      ]),
    Error,
    "Cyclic dependency",
  );
});

Deno.test("composition rejects unknown depends_on slot", () => {
  assertThrows(
    () =>
      resolveProvisioningOrder([
        { slot: "a", kind: "canvas", ref: "a", depends_on: ["missing"] },
      ]),
    Error,
    "Unknown dependency",
  );
});

Deno.test("slot map populates TesEventContext fields", () => {
  const composition = loadComposition("tes-event");
  const updated = applySlotIds(baseContext, composition, {
    dashboard: "new-dash",
    requirements: "new-req",
  });

  assertEquals(updated.dashboardCanvasId, "new-dash");
  assertEquals(updated.requirementsCanvasId, "new-req");
  assertEquals(updated.deliverablesListId, "list1");
});

Deno.test("kind registry loads stable canvas kind", () => {
  resetKindCacheForTests();
  const kind = loadKindDefinition("canvas");
  assertEquals(kind.api_availability, "stable");
  assertEquals(isKindProvisionable("canvas"), true);
});

Deno.test("invalid composition JSON missing runtime throws", () => {
  assertThrows(
    () =>
      parseCompositionJson(
        JSON.stringify({
          version: "1",
          channel_type: "tes-event",
          resources: [{ slot: "a", kind: "canvas", ref: "a" }],
          navigation: { title: "T", entries: [] },
        }),
      ),
    Error,
    "runtime",
  );
});

Deno.test("navigation entries render pinned index links in order", () => {
  resetMessageCacheForTests();
  const composition = loadComposition("tes-event");
  const message = renderPinnedIndexMessage(baseContext, composition);

  assertEquals(message.includes("TES Event Channel Index"), true);
  assertEquals(message.includes("<canvas:dash1|Dashboard>"), true);
  assertEquals(message.includes("<canvas:req1|Requirements>"), true);
  assertEquals(message.includes("<list:list1|Deliverables>"), true);

  const dashboardPos = message.indexOf("Dashboard");
  const requirementsPos = message.indexOf("Requirements");
  const deliverablesPos = message.indexOf("Deliverables");
  assertEquals(dashboardPos < requirementsPos, true);
  assertEquals(requirementsPos < deliverablesPos, true);
});

Deno.test("channel provisioner creates resources in dependency order", async () => {
  resetCompositionCacheForTests();
  resetKindCacheForTests();
  resetMessageCacheForTests();

  const createOrder: string[] = [];

  const client = {
    canvases: {
      create: async (params: {
        title: string;
      }) => {
        createOrder.push(`canvas:${params.title}`);
        return { canvas_id: `C-${params.title}` };
      },
      edit: async () => ({}),
      sections: {
        lookup: async () => ({ sections: [] }),
      },
    },
    slackLists: {
      create: async (params: { name: string }) => {
        createOrder.push(`list:${params.name}`);
        return { list_id: `L-${params.name}` };
      },
      items: {
        create: async () => ({ item: { id: "item1" } }),
      },
    },
    chat: {
      postMessage: async () => ({ ts: "1234.5678" }),
    },
    pins: {
      add: async () => ({}),
    },
  };

  const context = await provisionChannel(client, {
    channel_id: "C999",
    project_name: "Demo",
  });

  assertEquals(context.channelType, "tes-event");
  assertEquals(context.compositionVersion, "1.0.0");
  assertEquals(context.dashboardCanvasId, "C-Dashboard");
  assertEquals(context.requirementsCanvasId, "C-Requirements");
  assertEquals(context.deliverablesListId, "L-Deliverables");
  assertEquals(context.incidentsListId, "L-Incidents");
  assertEquals(createOrder.indexOf("canvas:Dashboard"), createOrder.length - 1);
});
