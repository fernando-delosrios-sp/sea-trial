import { assertEquals, assertStringIncludes, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  MISSING_ONBOARDING_SNAPSHOT_ERROR,
  serializeEventContext,
  serializeEventContextSnapshot,
} from "../lib/event-context.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { readCanvasMarkdown } from "../lib/canvas.ts";
import {
  executeOnboardingSubmit,
  loadDashboardContentForButton,
} from "../lib/onboarding-view-submit.ts";
import { resolveDashboardCanvasContent } from "../functions/open_onboarding/mod.ts";

const baseContext: TesEventContext = {
  channelId: "C1",
  projectName: "Acme",
  onboardingComplete: false,
  derivedComponents: [],
  dashboardCanvasId: "dash-1",
  requirementsCanvasId: "req-1",
  deliverablesListId: "list-1",
  incidentsListId: "list-2",
  infrastructureCanvasId: "infra-1",
  situationReportCanvasId: "sr1",
  accountName: "Acme Corp",
};

const onboardingForm = {
  accountName: "Acme Corp",
  mainProspectGoal: "PoC",
  dealHistory: "New",
  projectType: "PoC",
  stakeholders: "SE",
  competitors: "None",
  sailpointSuite: "Identity Security Cloud",
  deadline: "2026-09-01",
  notes: "",
};

function mockCanvasClient(sections: Array<{ id: string; markdown?: string }>) {
  return {
    chat: { postMessage: async () => ({}) },
    canvases: {
      create: async () => ({ canvas: { id: "dash-1" } }),
      edit: async () => ({}),
      sections: {
        lookup: async () => ({ sections }),
      },
    },
  };
}

Deno.test("readCanvasMarkdown includes metadata section outside headers", async () => {
  const metadata = serializeEventContext(baseContext);
  const client = mockCanvasClient([
    { id: "s1", markdown: "# TES Event Dashboard\n\n## Project" },
    { id: "s2", markdown: metadata },
  ]);

  const content = await readCanvasMarkdown(client, "dash-1");
  assertStringIncludes(content, "<!-- tes-event-context -->");
  assertStringIncludes(content, "Acme Corp");
});

Deno.test("Dashboard-link open with snapshot (no lookup)", () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const client = {
    canvases: {
      sections: {
        lookup: async () => {
          throw new Error("readCanvasMarkdown must not be invoked");
        },
      },
    },
  };

  const content = resolveDashboardCanvasContent(client, {
    dashboard_canvas_id: "dash-1",
    dashboard_canvas_content: snapshot,
  });

  assertEquals(content, snapshot);
});

Deno.test("pinned button open with snapshot", () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const content = loadDashboardContentForButton(
    JSON.stringify({
      dashboard_canvas_id: "dash-1",
      dashboard_canvas_content: snapshot,
    }),
    "",
  );

  assertEquals(content, snapshot);
  assertStringIncludes(content, "Acme Corp");
});

Deno.test("missing snapshot errors", () => {
  const client = {
    canvases: {
      sections: {
        lookup: async () => {
          throw new Error("readCanvasMarkdown must not be invoked");
        },
      },
    },
  };

  assertEquals(
    resolveDashboardCanvasContent(client, { dashboard_canvas_id: "dash-1" }),
    "",
  );
  assertEquals(
    loadDashboardContentForButton(
      JSON.stringify({ dashboard_canvas_id: "dash-1" }),
      "",
    ),
    "",
  );
});

Deno.test("Open onboarding from Dashboard canvas link does not error as empty dashboard when canvas ID is baked", () => {
  const content = resolveDashboardCanvasContent({}, {});
  assertEquals(content, "");
});

Deno.test("readCanvasMarkdown not invoked from onboarding open or submit source", () => {
  const openSource = Deno.readTextFileSync(
    new URL("../functions/open_onboarding/mod.ts", import.meta.url),
  );
  const submitSource = Deno.readTextFileSync(
    new URL("../lib/onboarding-view-submit.ts", import.meta.url),
  );
  assertEquals(openSource.includes("readCanvasMarkdown"), false);
  assertEquals(submitSource.includes("readCanvasMarkdown"), false);
});

Deno.test("submit updates Dashboard from snapshot", async () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });
  const edited: string[] = [];
  let lookupCalled = false;

  try {
    const result = await executeOnboardingSubmit(
      {
        chat: { postMessage: async () => ({}) },
        files: {
          getUploadURLExternal: async () => ({
            ok: true,
            upload_url: "https://upload.example.test",
            file_id: "F-banner",
          }),
          completeUploadExternal: async () => ({
            ok: true,
            files: [{
              permalink: "https://example.slack.com/files/U1/F1/banner.png",
            }],
          }),
          info: async () => ({
            ok: true,
            file: { permalink: "https://example.slack.com/files/U1/F1/banner.png" },
          }),
        },
        canvases: {
          edit: async (params: {
            canvas_id: string;
            changes: Array<{ document_content?: { markdown: string } }>;
          }) => {
            const markdown = params.changes[0]?.document_content?.markdown ?? "";
            edited.push(markdown);
            return {};
          },
          sections: {
            lookup: async () => {
              lookupCalled = true;
              throw new Error("readCanvasMarkdown must not be invoked");
            },
          },
        },
      },
      {
        channel_id: "C1",
        dashboard_canvas_content: snapshot,
      },
      onboardingForm,
    );

    assertEquals(result, { ok: true });
    assertEquals(lookupCalled, false);
    assertEquals(edited.length, 1);
    assertStringIncludes(edited[0], "Acme Corp");
    assertStringIncludes(edited[0], "<!-- tes-event-context -->");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("executeOnboardingSubmit missing snapshot errors without canvas read", async () => {
  const result = await executeOnboardingSubmit(
    {
      chat: { postMessage: async () => ({}) },
      files: {
        getUploadURLExternal: async () => ({ ok: false }),
        completeUploadExternal: async () => ({ ok: false }),
        info: async () => ({ ok: false }),
      },
      canvases: {
        edit: async () => {
          throw new Error("should not write dashboard");
        },
        sections: {
          lookup: async () => {
            throw new Error("readCanvasMarkdown must not be invoked");
          },
        },
      },
    },
    { channel_id: "C1", dashboard_canvas_content: "" },
    onboardingForm,
  );

  assertEquals(result, {
    ok: false,
    error: MISSING_ONBOARDING_SNAPSHOT_ERROR,
  });
});
