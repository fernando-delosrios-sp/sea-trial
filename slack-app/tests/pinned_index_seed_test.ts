import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { pinnedIndexBlocks } from "../lib/content/message-renderer.ts";
import { provisionChannel } from "../lib/content/channel-provisioner.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { resetCompositionCacheForTests } from "../lib/content/composition-resolver.ts";
import { resetKindCacheForTests } from "../lib/content/kind-registry.ts";
import { resetMessageCacheForTests } from "../lib/content/message-renderer.ts";

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
  accountName: "Acme Corp",
};

function provisionClient(
  postMessage: (params?: { text?: string }) => Promise<{ ts?: string; ok?: boolean }>,
) {
  return {
    files: {
      getUploadURLExternal: async () => ({
        ok: true,
        upload_url: "https://upload.example.test",
        file_id: "F1",
      }),
      completeUploadExternal: async () => ({
        ok: true,
        files: [{ permalink: "https://example.slack.com/files/U1/F1/x.png" }],
      }),
      info: async () => ({ ok: true, file: { permalink: "unused" } }),
    },
    canvases: {
      create: async (params: { title: string }) => ({
        canvas_id: `C-${params.title}`,
      }),
      edit: async () => ({}),
      sections: { lookup: async () => ({ sections: [] }) },
    },
    slackLists: {
      create: async (params: { name: string }) => ({
        list_id: `L-${params.name}`,
      }),
      access: { set: async () => ({ ok: true }) },
      items: {
        create: async () => ({ item: { id: "item1" } }),
        list: async () => ({ items: [] }),
      },
    },
    apiCall: async () => ({ error: "unknown_method" }),
    bookmarks: { add: async () => ({ ok: true }) },
    chat: { postMessage },
    pins: { add: async () => ({}) },
    apps: {
      datastore: {
        get: async () => ({ ok: true }),
        put: async () => ({ ok: true }),
      },
    },
    workflows: {
      triggers: {
        permissions: {
          add: async () => ({ ok: true }),
        },
      },
    },
  };
}

Deno.test("pinned index has no Complete onboarding button at seed", () => {
  const blocks = pinnedIndexBlocks(baseContext, { teamId: "T01234567" });
  assertEquals(
    blocks.some((block) => (block as { type: string }).type === "actions"),
    false,
  );
});

Deno.test("seeding fails when the pinned index post has no timestamp", async () => {
  resetCompositionCacheForTests();
  resetKindCacheForTests();
  resetMessageCacheForTests();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  const postMessage = async (params?: { text?: string }) => {
    if (params?.text?.includes("Materials")) {
      return { ts: "drop.1234" };
    }
    return { ts: undefined };
  };

  try {
    await assertRejects(
      () =>
        provisionChannel(
          provisionClient(postMessage),
          {
            channel_id: "C999",
            project_name: "Demo",
            account_name: "Acme",
            env: {
              SLACK_TEAM_ID: "T01234567",
              SLACK_ONBOARDING_TRIGGER_ID: "FtGLOBAL",
            },
          },
        ),
      Error,
      "Failed to post pinned index",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
