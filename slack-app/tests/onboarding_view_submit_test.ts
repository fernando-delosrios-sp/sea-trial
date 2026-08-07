import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { METADATA_MARKER, serializeEventContext } from "../lib/event-context.ts";
import type { TesEventContext } from "@tes/shared/types/index.ts";
import { readCanvasMarkdown } from "../lib/canvas.ts";
import { loadDashboardContentForButton } from "../lib/onboarding-view-submit.ts";

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
  accountName: "Acme Corp",
};

function mockCanvasClient(sections: Array<{ id: string; markdown?: string }>) {
  return {
    chat: { postMessage: async () => ({}) },
    canvases: {
      create: async () => ({ canvas: { id: "dash-1" } }),
      edit: async () => ({}),
      sections: {
        lookup: async (
          params: { criteria: { section_types?: string[]; contains_text?: string } },
        ) => {
          if (params.criteria.contains_text === METADATA_MARKER) {
            return {
              sections: sections.filter((section) =>
                section.markdown?.includes(METADATA_MARKER)
              ),
            };
          }
          return {
            sections: sections.filter((section) =>
              section.markdown?.includes("#") || section.markdown?.includes("##")
            ),
          };
        },
      },
    },
  };
}

Deno.test("readCanvasMarkdown includes metadata section outside headers", async () => {
  const metadata = serializeEventContext(baseContext);
  const client = mockCanvasClient([
    { id: "s1", markdown: "# TES Event Dashboard\n\n## Project" },
    { id: "s2", markdown: metadata },
  ]);

  const content = await readCanvasMarkdown(client, "dash-1");
  assertStringIncludes(content, METADATA_MARKER);
  assertStringIncludes(content, "Acme Corp");
});

Deno.test("loadDashboardContentForButton reads canvas via button value", async () => {
  const metadata = serializeEventContext(baseContext);
  const client = mockCanvasClient([
    { id: "s1", markdown: "# Dashboard\n\n## Project" },
    { id: "s2", markdown: metadata },
  ]);

  const content = await loadDashboardContentForButton(
    client,
    JSON.stringify({ dashboard_canvas_id: "dash-1" }),
    "",
  );

  assertStringIncludes(content, METADATA_MARKER);
  assertStringIncludes(content, "Acme Corp");
});

Deno.test("loadDashboardContentForButton falls back when button value is missing", async () => {
  const fallback = serializeEventContext(baseContext);
  const client = mockCanvasClient([]);

  const content = await loadDashboardContentForButton(client, undefined, fallback);
  assertEquals(content, fallback);
});
