import { describe, expect, it } from "vitest";
import type { DeliveryConsolidationRequest } from "@tes-event-process/shared";
import { runDeliveryConsolidation } from "../src/agents/delivery/consolidate.js";

const baseRequest: DeliveryConsolidationRequest = {
  context: {
    channelId: "C123",
    projectName: "Acme",
    onboardingComplete: true,
    derivedComponents: ["IdentityNow"],
    dashboardCanvasId: "d1",
    requirementsCanvasId: "r1",
    deliverablesListId: "l1",
    incidentsListId: "i1",
    infrastructureCanvasId: "inf1",
  },
  row: {
    taskId: "TES-001",
    assigneeId: "U123",
    status: "Validation required",
    situation: "Testing",
    category: "SSO",
    requirements: "Configure SSO integration",
    openQuestions: "Which IdP?",
  },
};

describe("runDeliveryConsolidation", () => {
  it("produces draft v1 with review flag and sections", () => {
    const result = runDeliveryConsolidation(baseRequest);
    expect(result.draftVersion).toBe(1);
    expect(result.canvasMarkdown).toContain("Agent draft — pending review");
    expect(result.canvasMarkdown).toContain("Configure SSO integration");
    expect(result.canvasMarkdown).toContain("Visual proof is still pending");
  });

  it("preserves author when canvas author differs from assignee", () => {
    const first = runDeliveryConsolidation(baseRequest);
    const second = runDeliveryConsolidation({
      ...baseRequest,
      canvasMarkdown: first.canvasMarkdown.replace(
        "**Author:** U123",
        "**Author:** Manual Author",
      ),
    });
    expect(second.canvasMarkdown).toContain("**Author:** Manual Author");
  });

  it("configuration section references infrastructure for secrets", () => {
    const result = runDeliveryConsolidation({
      ...baseRequest,
      row: {
        ...baseRequest.row,
        requirements: "Use API key sk-secret-123 for connector",
      },
    });
    expect(result.canvasMarkdown).toContain("Infrastructure canvas");
    const configSection = result.canvasMarkdown.split("## Configuration")[1] ?? "";
    expect(configSection).not.toContain("sk-secret-123");
  });

  it("increments draft version on re-consolidation", () => {
    const first = runDeliveryConsolidation(baseRequest);
    const second = runDeliveryConsolidation({
      ...baseRequest,
      canvasMarkdown: first.canvasMarkdown,
    });
    expect(second.draftVersion).toBe(2);
  });
});
