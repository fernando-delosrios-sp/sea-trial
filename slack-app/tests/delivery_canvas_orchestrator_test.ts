import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import {
  ensureDeliveryCanvasForValidationRequired,
  type DeliveryCanvasOrchestratorClient,
} from "../lib/delivery-canvas-orchestrator.ts";

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

Deno.test("ensureDeliveryCanvasForValidationRequired suffixes title on collision", async () => {
  const titles: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({
      canvasMarkdown: "# Delivery: TASK-42\n\n## Customer summary\nDraft",
      draftVersion: 1,
    }), { status: 200 });

  const client: DeliveryCanvasOrchestratorClient = {
    canvases: {
      create: async (params) => {
        titles.push(params.title);
        if (params.title === "Delivery: TASK-42") {
          return { ok: false, error: "name_taken" };
        }
        return { ok: true, canvas_id: "canvas-delivery-1" };
      },
      edit: async () => ({}),
      sections: {
        lookup: async () => ({ sections: [] }),
      },
    },
  };

  try {
    const result = await ensureDeliveryCanvasForValidationRequired(client, {
      channelId: "C123",
      listId: "list1",
      context: baseContext,
      row: {
        taskId: "TASK-42",
        status: "Validation required",
        situation: "Testing",
        category: "SSO",
        requirements: "Configure SSO",
      },
      env: {
        AGENT_SERVICE_URL: "http://localhost:3000",
        SLACK_TEAM_ID: "T01234567",
      },
    });

    assertEquals(result.created, true);
    assertEquals(result.canvasId, "canvas-delivery-1");
    assertEquals(titles, ["Delivery: TASK-42", "Delivery: TASK-42-1"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
