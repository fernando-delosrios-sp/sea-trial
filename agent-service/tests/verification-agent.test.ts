import { describe, expect, it } from "vitest";
import type { VerificationRequest } from "@sea-trial/shared";
import { runVerificationAgent } from "../src/agents/verification/graph.js";

const baseRequest: VerificationRequest = {
  context: {
    channelId: "C123",
    projectName: "Acme Demo",
    onboardingComplete: true,
    derivedComponents: ["IdentityNow", "Access Manager"],
    dashboardCanvasId: "d1",
    requirementsCanvasId: "r1",
    deliverablesListId: "l1",
    incidentsListId: "i1",
    infrastructureCanvasId: "inf1",
  },
  deliverable: {
    taskId: "TASK-01",
    requirement_ref: "REQ-01",
    status: "Validation required",
    situation: "Completed integration",
    category: "SSO",
    requirements: "Configure Entra ID SSO connector",
  },
  proofInputs: {
    visualProofUrl: "https://www.loom.com/share/abc123xyz",
    notes: "Entra ID connector tested and active. Verified SSO login flow for 50 test users.",
    configuration: "Schema v1.2 with mapped attributes. api_key: sk-secret-token-123.",
    components: ["SailPoint Identity Security Cloud", "Entra ID Connector"],
  },
};

describe("VerificationAgent", () => {
  it("formats proof block and preserves exact Loom URL", () => {
    const result = runVerificationAgent(baseRequest);

    expect(result.status).toBe("Complete");
    expect(result.proofBlockMarkdown).toContain("### Delivery Proof & Outcome");
    expect(result.proofBlockMarkdown).toContain("https://www.loom.com/share/abc123xyz");
    expect(result.proof.visualProofUrl).toBe("https://www.loom.com/share/abc123xyz");
  });

  it("produces concise 2-sentence non-technical customer summary", () => {
    const result = runVerificationAgent(baseRequest);

    expect(result.proof.customerSummary).toBe(
      "Entra ID connector tested and active. Verified SSO login flow for 50 test users.",
    );
    expect(result.proofBlockMarkdown).toContain("- **Customer Summary:** Entra ID connector tested and active.");
  });

  it("does not invent visual proof URLs when omitted", () => {
    const result = runVerificationAgent({
      ...baseRequest,
      proofInputs: {
        ...baseRequest.proofInputs,
        visualProofUrl: undefined,
      },
    });

    expect(result.proof.visualProofUrl).toBeUndefined();
    expect(result.proofBlockMarkdown).toContain("_No visual proof link provided._");
    expect(result.proofBlockMarkdown).not.toContain("https://");
  });

  it("sanitizes credentials and secrets in configuration", () => {
    const result = runVerificationAgent(baseRequest);

    expect(result.proofBlockMarkdown).not.toContain("sk-secret-token-123");
    expect(result.proof.artefactsAndConfig).toContain("[Configuration sanitized");
  });

  it("formats external technologies as separate bullet", () => {
    const result = runVerificationAgent({
      ...baseRequest,
      proofInputs: {
        ...baseRequest.proofInputs,
        externalTechnologies: ["Microsoft Entra ID", "Okta"],
      },
    });

    expect(result.proofBlockMarkdown).toContain("- **Components:** SailPoint Identity Security Cloud, Entra ID Connector");
    expect(result.proofBlockMarkdown).toContain("- **External Technologies:** Microsoft Entra ID, Okta");
    expect(result.proof.externalTechnologies).toEqual(["Microsoft Entra ID", "Okta"]);
  });
});
