import { describe, expect, it } from "vitest";
import { extractRequirementProofsFromCanvas } from "../src/agents/reporting/index.js";

describe("ReportingAgent", () => {
  it("extracts customer summaries and demo links from REQ-XX proof blocks", () => {
    const canvasMarkdown = [
      "# Requirements Canvas",
      "",
      "## REQ-01: SSO Integration",
      "- **Status:** Complete",
      "- **Linked Deliverables:** `TASK-01`",
      "- **Customer Need:** Connect Entra ID",
      "",
      "### Acceptance Criteria",
      "- [x] SSO configured",
      "",
      "### Delivery Proof & Outcome",
      "- **Customer Summary:** Entra ID successfully connected and verified with active test users.",
      "- **Visual Proof:** [Demo Loom Video](https://loom.com/share/test-loom-123)",
      "- **Components:** SailPoint Identity Security Cloud, Entra ID Connector",
      "- **Artefacts & Config:** Connector schema v1.2",
      "",
      "## REQ-02: User Lifecycle Management",
      "- **Status:** Open",
      "- **Linked Deliverables:** `TASK-02`",
    ].join("\n");

    const proofs = extractRequirementProofsFromCanvas(canvasMarkdown);
    expect(proofs.length).toBe(1);
    expect(proofs[0].requirementRef).toBe("REQ-01");
    expect(proofs[0].customerSummary).toBe(
      "Entra ID successfully connected and verified with active test users.",
    );
    expect(proofs[0].visualProofUrl).toBe("https://loom.com/share/test-loom-123");
    expect(proofs[0].components).toEqual([
      "SailPoint Identity Security Cloud",
      "Entra ID Connector",
    ]);
  });
});
