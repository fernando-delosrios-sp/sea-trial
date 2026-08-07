import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  dashboardTemplate,
} from "../lib/content/canvas-renderer.ts";
import { pinnedIndexBlocks } from "../lib/content/message-renderer.ts";
import type { TesEventContext } from "@tes/shared/types/index.ts";

const baseContext: TesEventContext = {
  channelId: "C123",
  projectName: "Acme",
  onboardingComplete: false,
  derivedComponents: [],
  dashboardCanvasId: "dash1",
  requirementsCanvasId: "req1",
  deliverablesListId: "list1",
  incidentsListId: "list2",
  infrastructureCanvasId: "infra1",
  accountName: "Acme Corp",
  salesforceOpportunityUrl: "https://acme.my.salesforce.com/0061",
  memberUserIds: ["U123", "U456"],
  contextNotes: "Kickoff scheduled for next week",
};

Deno.test("dashboardTemplate Project section includes Account and Salesforce URL when set on context", () => {
  const markdown = dashboardTemplate(baseContext);

  assertStringIncludes(markdown, "Acme Corp");
  assertStringIncludes(markdown, "https://acme.my.salesforce.com/0061");
  assertStringIncludes(markdown, "<@U123>");
  assertStringIncludes(markdown, "<@U456>");
  assertStringIncludes(markdown, "Kickoff scheduled for next week");
});

Deno.test("dashboardTemplate Project section falls back gracefully when creation fields are unset", () => {
  const markdown = dashboardTemplate({
    channelId: "C123",
    projectName: "Acme",
    onboardingComplete: false,
    derivedComponents: [],
    dashboardCanvasId: "dash1",
    requirementsCanvasId: "req1",
    deliverablesListId: "list1",
    incidentsListId: "list2",
    infrastructureCanvasId: "infra1",
  });

  assertStringIncludes(markdown, "## Project");
  assertStringIncludes(markdown, "_Not set_");
});

Deno.test("pinnedIndexBlocks includes a Complete onboarding button when onboarding is incomplete", () => {
  const blocks = pinnedIndexBlocks(baseContext);
  const actionsBlock = blocks.find(
    (block) => (block as { type: string }).type === "actions",
  ) as { elements: Array<{ action_id: string; text: { text: string } }> };

  assertEquals(actionsBlock.elements.length, 1);
  assertEquals(actionsBlock.elements[0].action_id, "complete_onboarding");
  assertEquals(actionsBlock.elements[0].text.text, "Complete onboarding");
});

Deno.test("pinnedIndexBlocks omits the Complete onboarding button once onboarding is complete", () => {
  const blocks = pinnedIndexBlocks({ ...baseContext, onboardingComplete: true });
  const actionsBlock = blocks.find(
    (block) => (block as { type: string }).type === "actions",
  );

  assertEquals(actionsBlock, undefined);
});
