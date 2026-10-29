import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  MISSING_ONBOARDING_SNAPSHOT_ERROR,
  serializeEventContextSnapshot,
} from "../lib/event-context.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import {
  executeOnboardingSubmit,
  type SlackOnboardingSubmitClient,
} from "../lib/onboarding-view-submit.ts";
import {
  loadOnboardingContextFromStore,
  ONBOARDING_SUBMIT_ERROR_BLOCK_ID,
  type OnboardingCompletionClient,
  submitOnboardingView,
} from "../functions/open_onboarding/mod.ts";
import {
  applyOnboarding,
  type ApplyOnboardingClient,
  ONBOARDING_FORM_PARSE_ERROR,
} from "../functions/apply_onboarding/mod.ts";
import {
  TES_EVENT_CONTEXT_STORE_MISS_ERROR,
  tesEventContextStorePutError,
} from "../lib/tes-event-context-store.ts";
import { TES_EVENT_CONTEXT_DATASTORE_NAME } from "../datastores/tes_event_context.ts";

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

function submitClient(options?: {
  put?: (params: {
    datastore: string;
    item: { channel_id: string; snapshot: string };
  }) => Promise<{ ok: boolean; error?: string }>;
  postMessage?: (params: { channel: string; text: string }) => Promise<unknown>;
  edit?: (params: {
    canvas_id: string;
    changes: Array<{ document_content?: { markdown: string } }>;
  }) => Promise<unknown>;
  lookup?: () => Promise<unknown>;
}) {
  const puts: Array<{ datastore: string; item: { channel_id: string; snapshot: string } }> = [];
  const posted: Array<{ channel: string; text: string }> = [];
  const edited: string[] = [];
  const completions: Array<
    { function_execution_id: string; outputs: Record<string, unknown> }
  > = [];
  let lookupCalled = false;

  const client = {
    functions: {
      completeSuccess: async (
        params: {
          function_execution_id: string;
          outputs: Record<string, unknown>;
        },
      ) => {
        completions.push(params);
        return { ok: true };
      },
    },
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
    apps: {
      datastore: {
        get: async () => ({ ok: true, item: undefined }),
        put: async (params: {
          datastore: string;
          item: { channel_id: string; snapshot: string };
        }) => {
          puts.push(params);
          return options?.put ? options.put(params) : { ok: true };
        },
      },
    },
  };

  return {
    client: client as unknown as SlackOnboardingSubmitClient,
    submitClient: client as unknown as OnboardingCompletionClient,
    applyClient: client as unknown as ApplyOnboardingClient,
    puts,
    posted,
    edited,
    completions,
    lookupCalled: () => lookupCalled,
  };
}

const onboardingViewState = {
  account_name: { value: onboardingForm.accountName },
  main_prospect_goal: { value: onboardingForm.mainProspectGoal },
  deal_history: { value: onboardingForm.dealHistory },
  project_type: { value: onboardingForm.projectType },
  stakeholders: { value: onboardingForm.stakeholders },
  competitors: { value: onboardingForm.competitors },
  sailpoint_suite: { value: onboardingForm.sailpointSuite },
  deadline: { value: onboardingForm.deadline },
  notes: { value: onboardingForm.notes },
};

Deno.test("Open onboarding form from TES Event Context Store", async () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const result = await loadOnboardingContextFromStore(
    {
      apps: {
        datastore: {
          get: async () => ({
            ok: true,
            item: { channel_id: "C1", snapshot },
          }),
          put: async () => ({ ok: true }),
        },
      },
    },
    "C1",
  );
  assertEquals(result, { ok: true, snapshot });
});

Deno.test("Open onboarding from a non-TES channel fails clearly", async () => {
  const result = await loadOnboardingContextFromStore(
    {
      apps: {
        datastore: {
          get: async () => ({ ok: true, item: undefined }),
          put: async () => ({ ok: true }),
        },
      },
    },
    "C-oppties",
  );
  assertEquals(result, {
    ok: false,
    error: TES_EVENT_CONTEXT_STORE_MISS_ERROR,
  });
});

Deno.test("missing snapshot fails open with repair error", async () => {
  const result = await loadOnboardingContextFromStore(
    {
      apps: {
        datastore: {
          get: async () => ({
            ok: true,
            item: { channel_id: "C1", snapshot: "{not-json" },
          }),
          put: async () => ({ ok: true }),
        },
      },
    },
    "C1",
  );
  assertEquals(result.ok, false);
  if (result.ok) return;
  assertStringIncludes(result.error, "Re-run Create TES Event, or repair");
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
    assertEquals(edited.length, 2);
    assertEquals(posted.length, 1);
    assertStringIncludes(edited[1], "Acme Corp");
    assertStringIncludes(
      edited[0],
      "- [x] Run **Complete onboarding** — fill in opportunity details",
    );
    assertEquals(edited[0].includes("https://slack.com/shortcuts/"), false);
    assertEquals(edited[0].includes("<!-- tes-event-context -->"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("first submit puts store row and posts announcement", async () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  try {
    const { client, puts, posted } = submitClient();
    const result = await executeOnboardingSubmit(
      client,
      {
        channel_id: "C1",
        dashboard_canvas_content: snapshot,
      },
      onboardingForm,
    );

    assertEquals(result, { ok: true });
    assertEquals(puts.length, 1);
    assertEquals(puts[0]?.datastore, TES_EVENT_CONTEXT_DATASTORE_NAME);
    const updated = JSON.parse(puts[0]?.item.snapshot ?? "{}") as TesEventContext;
    assertEquals(updated.onboardingComplete, true);
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
    const { client, puts, posted, edited, lookupCalled } = submitClient();
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
    assertEquals(puts.length, 1);
    const updated = JSON.parse(puts[0]?.item.snapshot ?? "{}") as TesEventContext;
    assertEquals(updated.accountName, "Renamed Account");
    assertEquals(updated.onboarding?.notes, "Edited notes");
    assertEquals(posted.length, 0);
    assertEquals(edited.length, 2);
    assertStringIncludes(edited[1], "Renamed Account");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("executeOnboardingSubmit missing snapshot errors without canvas read", async () => {
  const { client, lookupCalled, puts, edited } = submitClient({
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
  assertEquals(puts.length, 0);
  assertEquals(edited.length, 0);
});

Deno.test("Submit fails when store write fails", async () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const { client, lookupCalled, puts, edited, posted } = submitClient({
    put: async () => ({ ok: false, error: "restricted_action" }),
    edit: async () => {
      throw new Error("should not write dashboard");
    },
  });
  const result = await executeOnboardingSubmit(
    client,
    { channel_id: "C1", dashboard_canvas_content: snapshot },
    onboardingForm,
  );

  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.error, tesEventContextStorePutError("restricted_action"));
  assertEquals(lookupCalled(), false);
  assertEquals(puts.length, 1);
  assertEquals(edited.length, 0);
  assertEquals(posted.length, 0);
});

Deno.test("Submit hands the form to the next step without doing slow work", async () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const { submitClient: client, completions, puts, edited, posted } =
    submitClient();

  const response = await submitOnboardingView(
    client,
    {
      private_metadata: JSON.stringify({
        channel_id: "C1",
        dashboard_canvas_content: snapshot,
      }),
      state: { values: onboardingViewState },
    },
    "Fx-exec-1",
  );

  assertEquals(response, {});
  assertEquals(completions.length, 1);
  assertEquals(completions[0]?.function_execution_id, "Fx-exec-1");
  assertEquals(completions[0]?.outputs.channel_id, "C1");
  assertEquals(completions[0]?.outputs.snapshot, snapshot);
  assertEquals(
    JSON.parse(String(completions[0]?.outputs.form_json)),
    onboardingForm,
  );

  // Store, canvas, and announcement belong to Apply Onboarding — doing them
  // here is what pushed the response past Slack's 3s view_submission budget.
  assertEquals(puts.length, 0);
  assertEquals(edited.length, 0);
  assertEquals(posted.length, 0);
});

Deno.test("Submit without usable metadata reports an error instead of throwing", async () => {
  const { submitClient: client, completions } = submitClient();

  const response = await submitOnboardingView(
    client,
    { private_metadata: "{not-json", state: { values: onboardingViewState } },
    "Fx-exec-3",
  );

  assertEquals(
    (response as { response_action?: string }).response_action,
    "errors",
  );
  assertEquals(completions.length, 0);
});

Deno.test("Submit without an execution id reports an error", async () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const { submitClient: client, completions } = submitClient();

  const response = await submitOnboardingView(
    client,
    {
      private_metadata: JSON.stringify({
        channel_id: "C1",
        dashboard_canvas_content: snapshot,
      }),
      state: { values: onboardingViewState },
    },
    undefined,
  );

  assertEquals(
    (response as { errors?: Record<string, string> })
      .errors?.[ONBOARDING_SUBMIT_ERROR_BLOCK_ID] !== undefined,
    true,
  );
  assertEquals(completions.length, 0);
});

Deno.test("Apply Onboarding does the store write, canvas, and announcement", async () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  try {
    const { applyClient: client, puts, edited, posted } = submitClient();
    const result = await applyOnboarding(client, {
      channel_id: "C1",
      snapshot,
      form_json: JSON.stringify(onboardingForm),
    });

    assertEquals(result, { ok: true });
    assertEquals(puts.length, 1);
    assertEquals(edited.length, 2);
    assertEquals(posted.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Apply Onboarding reports a store failure in the channel", async () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const { applyClient: client, posted } = submitClient({
    put: async () => ({ ok: false, error: "restricted_action" }),
  });

  const result = await applyOnboarding(client, {
    channel_id: "C1",
    snapshot,
    form_json: JSON.stringify(onboardingForm),
  });

  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.error, tesEventContextStorePutError("restricted_action"));
  assertEquals(posted.length, 1);
  assertStringIncludes(posted[0].text, "Onboarding was not saved");
  assertStringIncludes(posted[0].text, "restricted_action");
});

Deno.test("Apply Onboarding rejects an unreadable form", async () => {
  const snapshot = serializeEventContextSnapshot(baseContext);
  const { applyClient: client, puts, posted } = submitClient();

  const result = await applyOnboarding(client, {
    channel_id: "C1",
    snapshot,
    form_json: "{not-json",
  });

  assertEquals(result, { ok: false, error: ONBOARDING_FORM_PARSE_ERROR });
  assertEquals(puts.length, 0);
  assertEquals(posted.length, 1);
});
