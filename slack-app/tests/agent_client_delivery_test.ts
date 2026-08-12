import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { DeliveryConsolidationRequest } from "@tes/shared/types/index.ts";
import { callDeliveryAgent } from "../lib/agent-client.ts";

const sampleRequest: DeliveryConsolidationRequest = {
  context: {
    channelId: "C123",
    projectName: "Acme",
    onboardingComplete: true,
    derivedComponents: ["IdentityNow"],
    dashboardCanvasId: "d1",
    requirementsCanvasId: "r1",
    deliverablesListId: "l1",
    incidentsListId: "i1",
    infrastructureCanvasId: "i1",
  },
  row: {
    taskId: "TES-001",
    status: "Validation required",
    situation: "Testing",
    category: "SSO",
    requirements: "Configure SSO",
  },
};

Deno.test("callDeliveryAgent posts to delivery consolidate endpoint", async () => {
  let requestedUrl = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({
      canvasMarkdown: "# Delivery: TES-001",
      draftVersion: 1,
    }), { status: 200 });
  };

  try {
    const response = await callDeliveryAgent(
      "http://localhost:3000",
      sampleRequest,
      "corr-123",
    );
    assertEquals(requestedUrl, "http://localhost:3000/agents/delivery/consolidate");
    assertEquals(response.draftVersion, 1);
    assertEquals(response.canvasMarkdown.includes("TES-001"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
