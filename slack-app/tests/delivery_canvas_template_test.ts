import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  renderDeliveryFragment,
  resetCanvasCacheForTests,
} from "../lib/content/canvas-renderer.ts";

Deno.test("delivery fragment template loads and validates", () => {
  resetCanvasCacheForTests();
  const markdown = renderDeliveryFragment({
    customerSummary: "Summary text",
    visualProofUrl: "https://loom.com/share/123",
    sailpointComponents: "SailPoint Identity Security Cloud",
    externalTechnologies: "Active Directory",
    artefactsAndConfig: "Sanitized config",
  });

  assertEquals(markdown.includes("### Delivery Proof & Outcome"), true);
  assertEquals(markdown.includes("- **Customer Summary:** Summary text"), true);
  assertEquals(markdown.includes("- **Visual Proof:** [Demo Loom Video](https://loom.com/share/123)"), true);
  assertEquals(markdown.includes("- **Components:** SailPoint Identity Security Cloud"), true);
  assertEquals(markdown.includes("- **External Technologies:** Active Directory"), true);
  assertEquals(markdown.includes("- **Artefacts & Config:** Sanitized config"), true);
});
