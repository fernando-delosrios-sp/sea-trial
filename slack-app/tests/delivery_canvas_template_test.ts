import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  renderDeliveryCanvas,
  resetCanvasCacheForTests,
} from "../lib/content/canvas-renderer.ts";

Deno.test("delivery canvas template loads and validates", () => {
  resetCanvasCacheForTests();
  const markdown = renderDeliveryCanvas({
    taskId: "TES-001",
    category: "SSO",
    author: "U123",
    draftVersion: 1,
    generatedAt: "2026-08-12",
    reviewPending: true,
    businessValue: "Customer value",
    visualProof: "Screenshot",
    sailpointComponents: "- IdentityNow",
    externalTechnologies: "- Okta",
    customerSummary: "Summary text",
    artefactRows: "| rule.xml | config-artefact | repo | v1 |",
    configuration: "Non-secret checklist",
    notes: "",
  });

  assertEquals(markdown.includes("# Delivery: TES-001"), true);
  assertEquals(markdown.includes("## Business value"), true);
  assertEquals(markdown.includes("## Visual proof"), true);
  assertEquals(markdown.includes("## Customer summary"), true);
  assertEquals(markdown.includes("## Artefacts"), true);
  assertEquals(markdown.includes("## Configuration"), true);
  assertEquals(markdown.includes("Agent draft — pending review"), true);
});

Deno.test("customer summary heading exact for excerpt extraction", () => {
  resetCanvasCacheForTests();
  const markdown = renderDeliveryCanvas({
    taskId: "TES-002",
    category: "Connectors",
    author: "U456",
    draftVersion: 2,
    generatedAt: "2026-08-12",
    reviewPending: false,
    businessValue: "Value",
    visualProof: "Proof",
    sailpointComponents: "Components",
    externalTechnologies: "Tech",
    customerSummary: "Executive digest",
    artefactRows: "| — | — | — | — |",
    configuration: "Config",
    notes: "Notes",
  });
  assertEquals(markdown.includes("## Customer summary"), true);
});
