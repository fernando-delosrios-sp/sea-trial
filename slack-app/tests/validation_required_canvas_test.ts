import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { updateDeliverableStatus } from "../lib/deliverables-list-update.ts";

const baseContext: TesEventContext = {
  channelId: "C123",
  projectName: "Acme Demo",
  onboardingComplete: true,
  derivedComponents: ["IdentityNow"],
  dashboardCanvasId: "dash1",
  requirementsCanvasId: "req1",
  deliverablesListId: "list1",
  incidentsListId: "list2",
  infrastructureCanvasId: "infra1",
};

const agentResponse = {
  canvasMarkdown: [
    "# Delivery: TES-001",
    "",
    "> ⚠️ **Agent draft — pending review** · Draft v1 · 2026-08-12",
    "> **Author:** U123 · **Category:** SSO",
    "> **Actions:** [Consolidate draft](#consolidate-draft) · [Mark reviewed](#mark-reviewed)",
    "",
    "## Customer summary",
    "Configure SSO integration for Acme.",
  ].join("\n"),
  draftVersion: 1,
};

Deno.test("updateDeliverableStatus dispatches Validation required canvas creation", async () => {
  let updatedStatus = "";
  let createdCanvasId = "";
  let replacedMarkdown = "";

  const client = {
    slackLists: {
      items: {
        update: async (params: {
          fields: Array<{ column_id: string; value: string }>;
        }) => {
          const statusField = params.fields.find((f) => f.column_id === "status");
          if (statusField) {
            updatedStatus = statusField.value;
          }
        },
      },
    },
    canvases: {
      create: async () => ({ canvas_id: "canvas-delivery-1" }),
      edit: async (params: {
        changes: Array<{ document_content?: { markdown: string } }>;
      }) => {
        replacedMarkdown = params.changes[0]?.document_content?.markdown ?? "";
      },
      sections: {
        lookup: async () => ({ sections: [] }),
      },
    },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(agentResponse), { status: 200 });

  try {
    const result = await updateDeliverableStatus({
      client: client as Parameters<typeof updateDeliverableStatus>[0]["client"],
      channelId: "C123",
      listId: "list1",
      listItemId: "item-1",
      context: baseContext,
      row: {
        taskId: "TES-001",
        assigneeId: "U123",
        status: "In progress",
        situation: "Testing",
        category: "SSO",
        requirements: "Configure SSO integration",
      },
      newStatus: "Validation required",
      env: {
        AGENT_SERVICE_URL: "http://localhost:3000",
        SLACK_TEAM_ID: "T123",
      },
    });

    assertEquals(updatedStatus, "validation_required");
    assertEquals(result.canvasResult?.created, true);
    assertEquals(result.canvasResult?.canvasId, "canvas-delivery-1");
    assertEquals(replacedMarkdown.includes("consolidate_delivery"), true);
    assertEquals(replacedMarkdown.includes("tes-delivery-actions"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("updateDeliverableStatus skips canvas when already linked", async () => {
  let createCalled = false;

  const client = {
    slackLists: {
      items: {
        update: async () => {},
      },
    },
    canvases: {
      create: async () => {
        createCalled = true;
        return { canvas_id: "should-not-run" };
      },
      edit: async () => {},
      sections: { lookup: async () => ({ sections: [] }) },
    },
  };

  const result = await updateDeliverableStatus({
    client: client as Parameters<typeof updateDeliverableStatus>[0]["client"],
    channelId: "C123",
    listId: "list1",
    listItemId: "item-1",
    context: baseContext,
    row: {
      taskId: "TES-001",
      status: "In progress",
      situation: "Testing",
      category: "SSO",
      requirements: "Req",
      deliverableUrl: "canvas:existing",
    },
    newStatus: "Validation required",
    env: { AGENT_SERVICE_URL: "http://localhost:3000" },
  });

  assertEquals(createCalled, false);
  assertEquals(result.canvasResult, null);
});
