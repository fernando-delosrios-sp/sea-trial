import { describe, expect, it } from "vitest";
import { createRequirementsGraph } from "../src/agents/requirements/langgraph.js";

describe("Requirements Agent graph node order", () => {
  it("defines parseDocuments before analyzeRequirements and formatOutput after clarifyOrPropose", () => {
    const graph = createRequirementsGraph();
    const nodes = Object.keys((graph as { nodes?: Record<string, unknown> }).nodes ?? {});

    expect(nodes).toContain("loadContext");
    expect(nodes).toContain("parseDocuments");
    expect(nodes).toContain("analyzeRequirements");
    expect(nodes).toContain("clarifyOrPropose");
    expect(nodes).toContain("formatOutput");
  });
});
