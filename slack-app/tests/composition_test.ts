import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
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
  buildObjectLinkUrl,
} from "../lib/content/message-renderer.ts";

const navTeamId = "T01234567";
const navOptions = { teamId: navTeamId };

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

Deno.test("tes-event composition manifest loads and validates", () => {
  resetCompositionCacheForTests();
  const composition = loadComposition("tes-event");
  assertEquals(composition.channel_type, "tes-event");
  assertEquals(composition.version, "1.0.0");
  assertEquals(composition.resources.length, 6);
  assertEquals(
    getContextFieldForSlot(composition, "dashboard"),
    "dashboardCanvasId",
  );
});

Deno.test("composition provisioning order follows manifest resource order", () => {
  const composition = loadComposition("tes-event");
  const ordered = resolveProvisioningOrder(composition.resources);
  const slots = ordered.map((entry) => entry.slot);

  assertEquals(slots[0], "dashboard");
  assertEquals(slots.indexOf("situation_report"), 1);
  assertEquals(slots.indexOf("infrastructure"), 2);
  assertEquals(slots.indexOf("requirements"), 3);
  assertEquals(slots.indexOf("deliverables"), 4);
  assertEquals(slots.indexOf("incidents"), slots.length - 1);
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
  const message = renderPinnedIndexMessage(baseContext, composition, navOptions);

  assertEquals(message.includes("TES Event Channel Index"), true);
  assertEquals(
    message.includes(
      formatMrkdwn(buildObjectLinkUrl(navTeamId, "canvas", "dash1"), "Dashboard"),
    ),
    true,
  );
  assertEquals(
    message.includes(
      formatMrkdwn(
        buildObjectLinkUrl(navTeamId, "canvas", "req1"),
        "Requirements",
      ),
    ),
    true,
  );
  assertEquals(
    message.includes(
      formatMrkdwn(buildObjectLinkUrl(navTeamId, "list", "list1"), "Deliverables"),
    ),
    true,
  );
  assertEquals(
    message.includes(
      formatMrkdwn(
        buildObjectLinkUrl(navTeamId, "canvas", "sr1"),
        "Situation Report",
      ),
    ),
    true,
  );
  assertEquals(message.includes("<canvas:"), false);
  assertEquals(message.includes("<list:"), false);

  const dashboardPos = message.indexOf("Dashboard");
  const situationPos = message.indexOf("Situation Report");
  const requirementsPos = message.indexOf("Requirements");
  const deliverablesPos = message.indexOf("Deliverables");
  assertEquals(dashboardPos < situationPos, true);
  assertEquals(situationPos < requirementsPos, true);
  assertEquals(requirementsPos < deliverablesPos, true);
});

function formatMrkdwn(url: string, label: string): string {
  return `<${url}|${label}>`;
}

Deno.test("navigation entry with unmapped slot throws", () => {
  resetMessageCacheForTests();
  const composition = loadComposition("tes-event");
  const badComposition = {
    ...composition,
    navigation: {
      ...composition.navigation,
      entries: [
        {
          slot: "unknown_slot",
          label: "Broken",
          link_type: "canvas" as const,
        },
      ],
    },
  };

  assertThrows(
    () => renderPinnedIndexMessage(baseContext, badComposition, navOptions),
    Error,
    'slot "unknown_slot" which is not mapped in runtime.context_slot_map',
  );
});

Deno.test("channel provisioner creates resources in dependency order", async () => {
  resetCompositionCacheForTests();
  resetKindCacheForTests();
  resetMessageCacheForTests();

  const createOrder: string[] = [];
  const listItemCreates: string[] = [];
  const listCreateParams: Array<Record<string, unknown>> = [];
  const listBookmarkAdds: string[] = [];
  const canvasEditContents: string[] = [];
  let onboardingTriggerCreates = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  try {
  const client = {
    files: {
      getUploadURLExternal: async () => ({
        ok: true,
        upload_url: "https://upload.example.test",
        file_id: `F-${crypto.randomUUID()}`,
      }),
      completeUploadExternal: async (params: {
        files: Array<{ id: string; title: string }>;
        channel_id?: string;
      }) => {
        assertEquals("channel_id" in params, false);
        return {
          ok: true,
          files: [{
            permalink: "https://example.slack.com/files/U1/F1/banner.png",
          }],
        };
      },
      info: async () => ({ ok: true, file: { permalink: "unused" } }),
    },
    canvases: {
      create: async (params: {
        title: string;
        channel_id?: string;
      }) => {
        createOrder.push(
          params.channel_id
            ? `canvas:${params.title}`
            : `canvas-standalone:${params.title}`,
        );
        return { canvas_id: `C-${params.title}` };
      },
      edit: async (params: {
        canvas_id: string;
        changes: Array<{ document_content?: { markdown: string } }>;
      }) => {
        const markdown = params.changes.find((change) =>
          change.document_content?.markdown
        )?.document_content?.markdown;
        if (markdown) canvasEditContents.push(markdown);
        return {};
      },
      sections: {
        lookup: async () => ({ sections: [] }),
      },
    },
    slackLists: {
      create: async (params: { name: string }) => {
        createOrder.push(`list:${params.name}`);
        listCreateParams.push({ ...params });
        return { list_id: `L-${params.name}` };
      },
      access: {
        set: async () => ({ ok: true }),
      },
      items: {
        create: async (params: { list_id: string }) => {
          listItemCreates.push(params.list_id);
          return { item: { id: "item1" } };
        },
        list: async () => ({ items: [] }),
      },
    },
    bookmarks: {
      add: async (params: { title: string; link: string }) => {
        listBookmarkAdds.push(`${params.title}:${params.link}`);
        return { ok: true };
      },
    },
    chat: {
      postMessage: async () => ({ ts: "1234.5678" }),
    },
    pins: {
      add: async () => ({}),
    },
    workflows: {
      triggers: {
        create: async () => {
          onboardingTriggerCreates += 1;
          return {
            ok: true,
            trigger: {
              id: "FtONBOARD123",
              share_url: "https://slack.com/shortcuts/FtONBOARD123/abc",
            },
          };
        },
        permissions: {
          add: async () => ({ ok: true }),
        },
      },
    },
  };

  const context = await provisionChannel(client, {
    channel_id: "C999",
    project_name: "Demo",
    account_name: "Acme Corp",
    env: { SLACK_TEAM_ID: navTeamId },
  });

  assertEquals(context.channelType, "tes-event");
  assertEquals(context.compositionVersion, "1.0.0");
  assertEquals(context.dashboardCanvasId, "C-Dashboard");
  assertEquals(context.requirementsCanvasId, "C-Requirements");
  assertEquals(context.deliverablesListId, "L-Acme Corp Deliverables");
  assertEquals(context.incidentsListId, "L-Acme Corp Incidents");
  assertEquals(context.situationReportCanvasId, "C-Situation Report");
  assertEquals(createOrder.indexOf("canvas:Dashboard"), 0);
  assertEquals(createOrder.indexOf("canvas:Situation Report"), 1);
  assertEquals(createOrder.indexOf("canvas:Infrastructure"), 2);
  assertEquals(createOrder.indexOf("canvas-standalone:Requirements"), 3);
  assertEquals(createOrder.indexOf("list:Acme Corp Deliverables"), 4);
  assertEquals(createOrder.indexOf("list:Acme Corp Incidents"), 5);
  assertEquals(listItemCreates.length, 2);
  assertEquals(listCreateParams.map((params) => params.name), [
    "Acme Corp Deliverables",
    "Acme Corp Incidents",
  ]);
  assertEquals(listBookmarkAdds, [
    `Acme Corp Deliverables:https://app.slack.com/lists/${navTeamId}/L-Acme Corp Deliverables`,
    `Acme Corp Incidents:https://app.slack.com/lists/${navTeamId}/L-Acme Corp Incidents`,
  ]);
  assertEquals(
    createOrder.indexOf("canvas:Infrastructure") <
      createOrder.indexOf("list:Acme Corp Deliverables"),
    true,
  );
  assertEquals(onboardingTriggerCreates, 1);
  assertEquals(canvasEditContents.length > 0, true);
  assertEquals(
    canvasEditContents.some((content) =>
      content.includes("https://slack.com/shortcuts/FtONBOARD123/abc")
    ),
    true,
  );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

