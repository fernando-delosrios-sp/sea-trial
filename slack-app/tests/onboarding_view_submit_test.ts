import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  MISSING_ONBOARDING_SNAPSHOT_ERROR,
  MISSING_ONBOARDING_TRIGGER_ID_ERROR,
  serializeEventContextSnapshot,
} from "../lib/event-context.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import {
  executeOnboardingSubmit,
  loadDashboardContentForButton,
  type SlackOnboardingSubmitClient,
} from "../lib/onboarding-view-submit.ts";
import { resolveDashboardCanvasContent, requireOnboardingSnapshot } from "../functions/open_onboarding/mod.ts";

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
  onboardingLinkUrl: "https://slack.com/shortcuts/FtONBOARD1/secret",
  onboardingTriggerId: "FtONBOARD1",
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

function submitClient(options?: {
  update?: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  postMessage?: (params: { channel: string; text: string }) => Promise<unknown>;
  edit?: (params: {
    canvas_id: string;
    changes: Array<{ document_content?: { markdown: string } }>;
  }) => Promise<unknown>;
  lookup?: () => Promise<unknown>;
}) {
  const updatePayloads: Record<string, unknown>[] = [];
  const posted: Array<{ channel: string; text: string }> = [];
  const edited: string[] = [];
  let lookupCalled = false;

  const client = {
    chat: {
      postMessage: async (params: { channel: string; text: string }) => {
        posted.push(params);
        return options?.postMessage ? options.postMessage(params) : {};
      },
    },
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
        if (options?.edit) return options.edit(params);
        return {};
      },
      sections: {
        lookup: async () => {
          lookupCalled = true;
          if (options?.lookup) return options.lookup();
          throw new Error("readCanvasMarkdown must not be invoked");
        },
      },
    },
    workflows: {
      triggers: {
        update: async (payload: Record<string, unknown>) => {
          updatePayloads.push(payload);
          return options?.update ? options.update(payload) : { ok: true };
        },
        permissions: {
          add: async () => ({ ok: true }),
        },
      },
    },
  };

  return {
    client: client as unknown as SlackOnboardingSubmitClient,
    updatePayloads,
    posted,
    edited,
    lookupCalled: () => lookupCalled,
  };
}

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

Deno.test("missing snapshot fails open with repair error", () => {
  const result = requireOnboardingSnapshot({ dashboard_canvas_id: "dash-1" });
  assertEquals(result, {
    ok: false,
    error: MISSING_ONBOARDING_SNAPSHOT_ERROR,
  });
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

  try {
    const { client, posted, edited, lookupCalled } = submitClient();
    const result = await executeOnboardingSubmit(
      client,
      {
        channel_id: "C1",
        dashboard_canvas_content: snapshot,
      },
      onboardingForm,
    );

    assertEquals(result, { ok: true });
    assertEquals(lookupCalled(), false);
    assertEquals(edited.length, 1);
    assertEquals(posted.length, 1);
    assertStringIncludes(edited[0], "Acme Corp");
    assertStringIncludes(
      edited[0],
      "- [x] **[Complete onboarding](https://slack.com/shortcuts/FtONBOARD1/secret)** — fill in opportunity details",
    );
    assertEquals(edited[0].includes("<!-- tes-event-context -->"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("first submit updates trigger snapshot and posts announcement", async () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  try {
    const { client, updatePayloads, posted } = submitClient();
    const result = await executeOnboardingSubmit(
      client,
      {
        channel_id: "C1",
        dashboard_canvas_content: snapshot,
      },
      onboardingForm,
    );

    assertEquals(result, { ok: true });
    assertEquals(updatePayloads.length, 1);
    assertEquals(updatePayloads[0]?.trigger_id, "FtONBOARD1");
    const inputs = updatePayloads[0]?.inputs as Record<string, { value: string }>;
    const updated = JSON.parse(inputs.dashboard_canvas_content.value) as TesEventContext;
    assertEquals(updated.onboardingComplete, true);
    assertEquals(updated.onboardingTriggerId, "FtONBOARD1");
    assertEquals(updated.onboarding?.sailpointSuite, "Identity Security Cloud");
    assertEquals(posted.length, 1);
    assertStringIncludes(posted[0].text, "Onboarding complete");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Re-submit refreshes snapshot without repeating announcement", async () => {
  const snapshot = serializeEventContextSnapshot({
    ...baseContext,
    onboardingComplete: true,
    onboarding: onboardingForm,
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  try {
    const { client, updatePayloads, posted, edited, lookupCalled } = submitClient();
    const result = await executeOnboardingSubmit(
      client,
      {
        channel_id: "C1",
        dashboard_canvas_content: snapshot,
      },
      { ...onboardingForm, accountName: "Renamed Account", notes: "Edited notes" },
    );

    assertEquals(result, { ok: true });
    assertEquals(lookupCalled(), false);
    assertEquals(updatePayloads.length, 1);
    const inputs = updatePayloads[0]?.inputs as Record<string, { value: string }>;
    const updated = JSON.parse(inputs.dashboard_canvas_content.value) as TesEventContext;
    assertEquals(updated.accountName, "Renamed Account");
    assertEquals(updated.onboarding?.notes, "Edited notes");
    assertEquals(posted.length, 0);
    assertEquals(edited.length, 1);
    assertStringIncludes(edited[0], "Renamed Account");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("executeOnboardingSubmit missing snapshot errors without canvas read", async () => {
  const { client, lookupCalled, updatePayloads, edited } = submitClient({
    edit: async () => {
      throw new Error("should not write dashboard");
    },
  });
  const result = await executeOnboardingSubmit(
    client,
    { channel_id: "C1", dashboard_canvas_content: "" },
    onboardingForm,
  );

  assertEquals(result, {
    ok: false,
    error: MISSING_ONBOARDING_SNAPSHOT_ERROR,
  });
  assertEquals(lookupCalled(), false);
  assertEquals(updatePayloads.length, 0);
  assertEquals(edited.length, 0);
});

Deno.test("Submit fails when trigger id is missing", async () => {
  const snapshot = serializeEventContextSnapshot({
    ...baseContext,
    onboardingTriggerId: undefined,
  });
  const { client, lookupCalled, updatePayloads, edited, posted } = submitClient({
    edit: async () => {
      throw new Error("should not write dashboard");
    },
  });
  const result = await executeOnboardingSubmit(
    client,
    { channel_id: "C1", dashboard_canvas_content: snapshot },
    onboardingForm,
  );

  assertEquals(result, {
    ok: false,
    error: MISSING_ONBOARDING_TRIGGER_ID_ERROR,
  });
  assertEquals(lookupCalled(), false);
  assertEquals(updatePayloads.length, 0);
  assertEquals(edited.length, 0);
  assertEquals(posted.length, 0);
});
