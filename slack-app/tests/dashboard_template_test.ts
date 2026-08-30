import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  dashboardTemplate,
  renderDashboardCanvas,
} from "../lib/content/canvas-renderer.ts";
import { pinnedIndexBlocks } from "../lib/content/message-renderer.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";

const navOptions = { teamId: "T01234567" };

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
  situationReportCanvasId: "sr1",
  accountName: "Acme Corp",
  salesforceOpportunityUrl: "https://acme.my.salesforce.com/0061",
  memberUserIds: ["U123", "U456"],
  contextNotes: "Kickoff scheduled for next week",
};

Deno.test("dashboardTemplate includes default editorial content", () => {
  const markdown = dashboardTemplate(baseContext);

  assertStringIncludes(markdown, "Welcome to your TES event dashboard!");
  assertStringIncludes(markdown, "Rules of engagement");
  assertStringIncludes(markdown, "../../assets/Sales%20Engineer%20banner.png");
  assertStringIncludes(markdown, "Identify the main stakeholders");
});

Deno.test("Dashboard canvas does not append TesEventContext JSON dump", () => {
  const markdown = dashboardTemplate(baseContext);

  assertEquals(markdown.includes("<!-- tes-event-context -->"), false);
  assertEquals(markdown.includes("```json"), false);
  assertEquals(markdown.includes('"dashboardCanvasId"'), false);
});

Deno.test("renderDashboardCanvas substitutes provided asset URLs", () => {
  const markdown = renderDashboardCanvas(baseContext, undefined, {
    assetUrls: {
      "../../assets/Sales Engineer banner.png":
        "https://example.slack.com/files/U1/F1/banner.png",
    },
  });

  assertStringIncludes(
    markdown,
    "![Sales Engineer](https://example.slack.com/files/U1/F1/banner.png)",
  );
});

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
  situationReportCanvasId: "sr1",
  });

  assertStringIncludes(markdown, "## Project");
  assertStringIncludes(markdown, "_Not set_");
});

Deno.test("Dashboard instructs the user to run Complete onboarding", () => {
  const markdown = renderDashboardCanvas(baseContext);

  assertStringIncludes(markdown, "Complete onboarding");
  assertEquals(markdown.includes("https://slack.com/shortcuts/"), false);
  assertEquals(markdown.includes("- [ ] Fill in opportunity details"), false);
});

Deno.test("Onboarding CTA replaces the opportunity details task while incomplete", () => {
  const markdown = renderDashboardCanvas(baseContext);

  assertStringIncludes(
    markdown,
    "- [ ] ⏳ Run **Complete onboarding** to fill in opportunity details and unlock the Requirements Agent.",
  );
  assertEquals(markdown.includes("- [ ] Fill in opportunity details"), false);
  assertEquals(markdown.includes("## Onboarding\n"), false);
});

Deno.test("Onboarding task ticked after submit", () => {
  const markdown = renderDashboardCanvas(
    { ...baseContext, onboardingComplete: true },
  );

  assertStringIncludes(
    markdown,
    "- [x] Run **Complete onboarding** — fill in opportunity details",
  );
  assertEquals(markdown.includes("to unlock the Requirements Agent"), false);
  assertEquals(markdown.includes("- [ ] Fill in opportunity details"), false);
  assertEquals(markdown.includes("https://slack.com/shortcuts/"), false);
});

Deno.test("pinnedIndexBlocks has no Complete onboarding button", () => {
  const blocks = pinnedIndexBlocks(baseContext, navOptions);
  const actionsBlock = blocks.find(
    (block) => (block as { type: string }).type === "actions",
  );
  assertEquals(actionsBlock, undefined);
  const encoded = JSON.stringify(blocks);
  assertEquals(encoded.includes("complete_onboarding"), false);
  assertEquals(encoded.includes("Edit onboarding"), false);
});

Deno.test("Oversized snapshot still seeds pinned index without a Complete onboarding button", () => {
  const oversized = {
    ...baseContext,
    contextNotes: "x".repeat(2000),
  };
  const blocks = pinnedIndexBlocks(oversized, navOptions);
  assertEquals(
    blocks.some((block) => (block as { type: string }).type === "actions"),
    false,
  );
});

Deno.test("pinnedIndexBlocks shows Publish situation report when onboarding is complete", () => {
  const blocks = pinnedIndexBlocks({ ...baseContext, onboardingComplete: true }, navOptions);
  const actionsBlock = blocks.find(
    (block) => (block as { type: string }).type === "actions",
  ) as {
    elements: Array<{
      action_id: string;
      text: { text: string };
      value: string | Record<string, unknown>;
    }>;
  };

  assertEquals(actionsBlock.elements.length, 1);
  assertEquals(actionsBlock.elements[0].action_id, "publish_situation_report");
  assertEquals(
    actionsBlock.elements[0].text.text,
    "Publish situation report",
  );
  const rawValue = actionsBlock.elements[0].value;
  assertEquals(typeof rawValue, "string");
  const buttonValue = JSON.parse(rawValue as string) as {
      dashboard_canvas_id: string;
      dashboard_canvas_content?: string;
      situation_report_canvas_id?: string;
    };
  assertEquals(buttonValue.dashboard_canvas_id, baseContext.dashboardCanvasId);
  assertEquals(buttonValue.situation_report_canvas_id, baseContext.situationReportCanvasId);
  assertEquals(
    buttonValue.dashboard_canvas_content,
    JSON.stringify({ ...baseContext, onboardingComplete: true }),
  );
});

