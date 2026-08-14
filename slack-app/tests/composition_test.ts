import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import {
  applyStepIds,
  getContextFieldForStepId,
  loadComposition,
  parseCompositionJson,
  resetCompositionCacheForTests,
} from "../lib/content/composition-resolver.ts";
import {
  isKindProvisionable,
  loadKindDefinition,
  resetKindCacheForTests,
  setKindAvailabilityForTests,
} from "../lib/content/kind-registry.ts";
import { provisionChannel } from "../lib/content/channel-provisioner.ts";
import type { CompositionManifest } from "../lib/content/composition-resolver.ts";
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
  assertEquals(composition.version, "1.0.0");
  assertEquals(composition.steps.length, 7);
  assertEquals(
    getContextFieldForStepId("dashboard"),
    "dashboardCanvasId",
  );
  assertEquals(composition.steps[0], {
    id: "dashboard",
    kind: "canvas",
    ref: "dashboard",
    title: "Dashboard",
    tab: true,
  });
});

Deno.test("composition steps follow tes-event provisioning order", () => {
  const composition = loadComposition("tes-event");
  const stepIds = composition.steps.map((step) => step.id);

  assertEquals(stepIds, [
    "dashboard",
    "situation_report",
    "infrastructure",
    "requirements",
    "deliverables",
    "incidents",
    "onboarding",
  ]);
});

Deno.test("composition canvas steps expose tab opt-in", () => {
  const composition = loadComposition("tes-event");
  const tabbed = composition.steps.filter(
    (step): step is typeof step & { kind: "canvas"; tab: true } =>
      step.kind === "canvas" && step.tab === true,
  );

  assertEquals(tabbed.map((step) => step.id), [
    "dashboard",
    "situation_report",
    "infrastructure",
  ]);
  const requirements = composition.steps.find((step) => step.id === "requirements");
  assertEquals(requirements?.kind, "canvas");
  assertEquals(requirements && "tab" in requirements ? requirements.tab : undefined, undefined);
});

Deno.test("composition list steps expose bookmark opt-in", () => {
  const composition = loadComposition("tes-event");
  const bookmarked = composition.steps.filter(
    (step): step is typeof step & { kind: "list"; bookmark: true } =>
      step.kind === "list" && step.bookmark === true,
  );

  assertEquals(bookmarked.map((step) => step.id), ["deliverables", "incidents"]);
});

Deno.test("composition workflow steps expose bookmark opt-in", () => {
  const composition = loadComposition("tes-event");
  const onboarding = composition.steps.find((step) => step.id === "onboarding");

  assertEquals(onboarding?.kind, "workflow");
  assertEquals(
    onboarding && "bookmark" in onboarding ? onboarding.bookmark : undefined,
    true,
  );
});

Deno.test("composition accepts workflow bookmark and featured flags", () => {
  const composition = parseCompositionJson(
    JSON.stringify({
      version: "1",
      steps: [{
        id: "onboarding",
        kind: "workflow",
        link: "open_onboarding_workflow",
        bookmark: true,
        featured: true,
      }],
    }),
  );

  const step = composition.steps[0];
  assertEquals(step.kind, "workflow");
  if (step.kind === "workflow") {
    assertEquals(step.bookmark, true);
    assertEquals(step.featured, true);
  }
});

Deno.test("composition rejects canvas step with featured flag", () => {
  assertThrows(
    () =>
      parseCompositionJson(
        JSON.stringify({
          version: "1",
          steps: [{
            id: "bad",
            kind: "canvas",
            ref: "dashboard",
            featured: true,
          }],
        }),
      ),
    Error,
    "featured",
  );
});

Deno.test("composition rejects list step with featured flag", () => {
  assertThrows(
    () =>
      parseCompositionJson(
        JSON.stringify({
          version: "1",
          steps: [{
            id: "bad",
            kind: "list",
            ref: "deliverables",
            featured: true,
          }],
        }),
      ),
    Error,
    "featured",
  );
});

Deno.test("step id map populates TesEventContext fields", () => {
  const updated = applyStepIds(baseContext, {
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

Deno.test("kind registry skips non-stable kinds for provisioning", () => {
  resetKindCacheForTests();
  setKindAvailabilityForTests("canvas", "planned");
  assertEquals(isKindProvisionable("canvas"), false);
});

Deno.test("invalid composition JSON missing steps throws", () => {
  assertThrows(
    () =>
      parseCompositionJson(
        JSON.stringify({
          version: "1",
        }),
      ),
    Error,
    "steps",
  );
});

Deno.test("composition rejects canvas step with bookmark flag", () => {
  assertThrows(
    () =>
      parseCompositionJson(
        JSON.stringify({
          version: "1",
          steps: [{
            id: "bad",
            kind: "canvas",
            ref: "dashboard",
            bookmark: true,
          }],
        }),
      ),
    Error,
    "bookmark",
  );
});

Deno.test("composition rejects list step with tab flag", () => {
  assertThrows(
    () =>
      parseCompositionJson(
        JSON.stringify({
          version: "1",
          steps: [{
            id: "bad",
            kind: "list",
            ref: "deliverables",
            tab: true,
          }],
        }),
      ),
    Error,
    "tab",
  );
});

Deno.test("composition rejects workflow step with ref", () => {
  assertThrows(
    () =>
      parseCompositionJson(
        JSON.stringify({
          version: "1",
          steps: [{
            id: "bad",
            kind: "workflow",
            ref: "onboarding",
            link: "open_onboarding_workflow",
          }],
        }),
      ),
    Error,
    "ref",
  );
});

Deno.test("step-derived navigation renders pinned index links in order", () => {
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

Deno.test("navigation entry with unmapped step id throws", () => {
  resetMessageCacheForTests();
  const composition = loadComposition("tes-event");
  const badComposition = {
    ...composition,
    steps: [
      {
        id: "unknown_step",
        kind: "canvas" as const,
        ref: "dashboard",
        title: "Broken",
      },
    ],
  };

  assertThrows(
    () => renderPinnedIndexMessage(baseContext, badComposition, navOptions),
    Error,
    'step id "unknown_step" which is not mapped',
  );
});

function buildWorkflowTriggerMock() {
  let createCalls = 0;
  const permissionAdds: Record<string, unknown>[] = [];

  return {
    createCalls: () => createCalls,
    permissionAdds: () => permissionAdds,
    workflows: {
      triggers: {
        create: async () => {
          createCalls += 1;
          const id = `FtONBOARD${createCalls}`;
          return { ok: true, trigger: { id } };
        },
        permissions: {
          add: async (payload: Record<string, unknown>) => {
            permissionAdds.push(payload);
            return { ok: true };
          },
        },
      },
      featured: {
        add: async () => ({ ok: true }),
      },
    },
  };
}

const provisionEnv = {
  SLACK_TEAM_ID: navTeamId,
  SLACK_ONBOARDING_TRIGGER_ID: "FtONBOARD123",
};

Deno.test("channel provisioner creates steps in manifest order", async () => {
  resetCompositionCacheForTests();
  resetKindCacheForTests();
  resetMessageCacheForTests();

  const createOrder: string[] = [];
  const listItemCreates: string[] = [];
  const listCreateParams: Array<Record<string, unknown>> = [];
  const listBookmarkAdds: string[] = [];
  const listTabApiCalls: string[] = [];
  const canvasEditContents: string[] = [];
  const workflowTriggerMock = buildWorkflowTriggerMock();
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
    apiCall: async (method: string) => {
      listTabApiCalls.push(method);
      return { error: "unknown_method" };
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
    workflows: workflowTriggerMock.workflows,
  };

  const context = await provisionChannel(client, {
    channel_id: "C999",
    project_name: "Demo",
    account_name: "Acme Corp",
    env: provisionEnv,
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
  assertEquals(listTabApiCalls.length, 0);
  assertEquals(
    createOrder.indexOf("canvas:Infrastructure") <
      createOrder.indexOf("list:Acme Corp Deliverables"),
    true,
  );
  assertEquals(workflowTriggerMock.createCalls(), 1);
  assertEquals(workflowTriggerMock.permissionAdds(), [{
    trigger_id: "FtONBOARD1",
    channel_ids: ["C999"],
  }]);
  assertEquals(canvasEditContents.length > 0, true);
  assertEquals(
    canvasEditContents.some((content) =>
      content.includes("https://slack.com/shortcuts/FtONBOARD1")
    ),
    true,
  );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("channel provisioner suffixes canvas and list names on collision", async () => {
  resetCompositionCacheForTests();
  resetKindCacheForTests();
  resetMessageCacheForTests();

  const canvasTitles: string[] = [];
  const listNames: string[] = [];
  const listBookmarkAdds: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  try {
    const context = await provisionChannel(
      {
        files: {
          getUploadURLExternal: async () => ({
            ok: true,
            upload_url: "https://upload.example.test",
            file_id: "F-banner",
          }),
          completeUploadExternal: async () => ({
            ok: true,
            files: [{ permalink: "https://example.slack.com/files/U1/F1/banner.png" }],
          }),
          info: async () => ({ ok: true, file: { permalink: "unused" } }),
        },
        canvases: {
          create: async (params: { title: string; channel_id?: string }) => {
            canvasTitles.push(params.title);
            if (params.title === "Dashboard") {
              return { ok: false, error: "name_taken" };
            }
            return { canvas_id: `C-${params.title}` };
          },
          edit: async () => ({}),
          sections: { lookup: async () => ({ sections: [] }) },
        },
        slackLists: {
          create: async (params: { name: string }) => {
            listNames.push(params.name);
            if (params.name === "Acme Corp Deliverables") {
              return { ok: false, error: "name_taken" };
            }
            return { list_id: `L-${params.name}` };
          },
          access: { set: async () => ({ ok: true }) },
          items: {
            create: async () => ({ item: { id: "item1" } }),
            list: async () => ({ items: [] }),
          },
        },
        apiCall: async () => ({ error: "unknown_method" }),
        bookmarks: {
          add: async (params: { title: string; link: string }) => {
            listBookmarkAdds.push(`${params.title}:${params.link}`);
            return { ok: true };
          },
        },
        chat: { postMessage: async () => ({ ts: "1234.5678" }) },
        pins: { add: async () => ({}) },
        workflows: buildWorkflowTriggerMock().workflows,
      },
      {
        channel_id: "C999",
        project_name: "Demo",
        account_name: "Acme Corp",
        env: provisionEnv,
      },
    );

    assertEquals(context.dashboardCanvasId, "C-Dashboard1");
    assertEquals(context.deliverablesListId, "L-Acme Corp Deliverables1");
    assertEquals(canvasTitles.slice(0, 2), ["Dashboard", "Dashboard1"]);
    assertEquals(listNames.slice(0, 2), [
      "Acme Corp Deliverables",
      "Acme Corp Deliverables1",
    ]);
    assertEquals(
      listBookmarkAdds.some((entry) =>
        entry.startsWith("Acme Corp Deliverables1:")
      ),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("channel provisioner skips steps for non-stable kinds", async () => {
  resetCompositionCacheForTests();
  resetKindCacheForTests();
  resetMessageCacheForTests();
  setKindAvailabilityForTests("canvas", "planned");

  const createOrder: string[] = [];
  const composition: CompositionManifest = {
    version: "1.0.0-test",
    steps: [{
      id: "dashboard",
      kind: "canvas",
      ref: "dashboard",
      title: "Dashboard",
      tab: true,
    }],
  };

  try {
    const context = await provisionChannel(
      {
        canvases: {
          create: async (params: { title: string }) => {
            createOrder.push(`canvas:${params.title}`);
            return { canvas_id: "C-skipped" };
          },
          edit: async () => ({}),
          sections: { lookup: async () => ({ sections: [] }) },
        },
        slackLists: {
          create: async () => ({ list_id: "L-unused" }),
          access: { set: async () => ({ ok: true }) },
          items: {
            create: async () => ({ item: { id: "item1" } }),
            list: async () => ({ items: [] }),
          },
        },
        chat: { postMessage: async () => ({ ts: "1.0" }) },
        pins: { add: async () => ({}) },
        files: {
          getUploadURLExternal: async () => ({
            ok: true,
            upload_url: "https://upload.example.test",
            file_id: "F1",
          }),
          completeUploadExternal: async () => ({
            ok: true,
            files: [{ permalink: "https://example.test/banner.png" }],
          }),
          info: async () => ({ ok: true, file: { permalink: "unused" } }),
        },
        workflows: buildWorkflowTriggerMock().workflows,
      },
      {
        channel_id: "C-planned",
        project_name: "Demo",
        env: provisionEnv,
      },
      "tes-event",
      composition,
    );

    assertEquals(createOrder.length, 0);
    assertEquals(context.dashboardCanvasId, "");
  } finally {
    resetKindCacheForTests();
  }
});

Deno.test("channel provisioner creates list without bookmark when flag absent", async () => {
  resetCompositionCacheForTests();
  resetKindCacheForTests();
  resetMessageCacheForTests();

  const listBookmarkAdds: string[] = [];
  const composition: CompositionManifest = {
    version: "1.0.0-test",
    steps: [{
      id: "deliverables",
      kind: "list",
      ref: "deliverables",
    }],
  };

  const context = await provisionChannel(
    {
      canvases: {
        create: async () => ({ canvas_id: "C-unused" }),
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
      bookmarks: {
        add: async (params: { title: string; link: string }) => {
          listBookmarkAdds.push(`${params.title}:${params.link}`);
          return { ok: true };
        },
      },
      chat: { postMessage: async () => ({ ts: "1.0" }) },
      pins: { add: async () => ({}) },
      files: {
        getUploadURLExternal: async () => ({
          ok: true,
          upload_url: "https://upload.example.test",
          file_id: "F1",
        }),
        completeUploadExternal: async () => ({
          ok: true,
          files: [{ permalink: "https://example.test/banner.png" }],
        }),
        info: async () => ({ ok: true, file: { permalink: "unused" } }),
      },
      workflows: buildWorkflowTriggerMock().workflows,
    },
    {
      channel_id: "C-list",
      project_name: "Demo",
      account_name: "Acme Corp",
      env: provisionEnv,
    },
    "tes-event",
    composition,
  );

  assertEquals(context.deliverablesListId, "L-Acme Corp Deliverables");
  assertEquals(listBookmarkAdds.length, 0);
});

Deno.test("channel provisioner creates per-channel onboarding triggers", async () => {
  resetCompositionCacheForTests();
  resetKindCacheForTests();
  resetMessageCacheForTests();

  const workflowTriggerMock = buildWorkflowTriggerMock();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  const baseClient = {
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
      create: async (params: { title: string; channel_id?: string }) => ({
        canvas_id: `C-${params.title}-${crypto.randomUUID().slice(0, 4)}`,
      }),
      edit: async () => ({}),
      sections: { lookup: async () => ({ sections: [] }) },
    },
    slackLists: {
      create: async (params: { name: string }) => ({
        list_id: `L-${params.name}-${crypto.randomUUID().slice(0, 4)}`,
      }),
      access: { set: async () => ({ ok: true }) },
      items: {
        create: async () => ({ item: { id: "item1" } }),
        list: async () => ({ items: [] }),
      },
    },
    apiCall: async () => ({ error: "unknown_method" }),
    bookmarks: { add: async () => ({ ok: true }) },
    chat: { postMessage: async () => ({ ts: "1234.5678" }) },
    pins: { add: async () => ({}) },
    workflows: workflowTriggerMock.workflows,
  };

  try {
    await provisionChannel(baseClient, {
      channel_id: "C111",
      project_name: "Alpha",
      account_name: "Acme Corp",
      env: provisionEnv,
    });
    await provisionChannel(baseClient, {
      channel_id: "C222",
      project_name: "Beta",
      account_name: "Acme Corp",
      env: provisionEnv,
    });

    assertEquals(workflowTriggerMock.createCalls(), 2);
    assertEquals(workflowTriggerMock.permissionAdds(), [
      { trigger_id: "FtONBOARD1", channel_ids: ["C111"] },
      { trigger_id: "FtONBOARD2", channel_ids: ["C222"] },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
