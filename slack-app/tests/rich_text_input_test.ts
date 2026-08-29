import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  richTextValueToLines,
  richTextValueToText,
} from "../lib/content/rich-text.ts";
import { dashboardTemplate } from "../lib/content/canvas-renderer.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";

function section(...text: string[]) {
  return {
    type: "rich_text_section",
    elements: text.map((value) => ({ type: "text", text: value })),
  };
}

Deno.test("bulleted list becomes one line per item", () => {
  const lines = richTextValueToLines({
    type: "rich_text",
    elements: [
      {
        type: "rich_text_list",
        style: "bullet",
        elements: [
          section("Dana Vance (CISO)"),
          section("Ravi Patel (IAM lead)"),
        ],
      },
    ],
  });

  assertEquals(lines, ["Dana Vance (CISO)", "Ravi Patel (IAM lead)"]);
});

Deno.test("plain paragraphs split on newlines and drop blank entries", () => {
  const lines = richTextValueToLines({
    type: "rich_text",
    elements: [section("Dana Vance\n\nRavi Patel\n")],
  });

  assertEquals(lines, ["Dana Vance", "Ravi Patel"]);
});

Deno.test("inline mentions, links, and emoji survive flattening", () => {
  const text = richTextValueToText({
    type: "rich_text",
    elements: [
      {
        type: "rich_text_section",
        elements: [
          { type: "user", user_id: "U123" },
          { type: "text", text: " see " },
          { type: "link", url: "https://acme.test", text: "the brief" },
          { type: "text", text: " " },
          { type: "emoji", name: "tada" },
        ],
      },
    ],
  });

  assertEquals(text, "<@U123> see the brief :tada:");
});

Deno.test("link without display text falls back to the URL", () => {
  const text = richTextValueToText({
    type: "rich_text",
    elements: [
      {
        type: "rich_text_section",
        elements: [{ type: "link", url: "https://acme.test" }],
      },
    ],
  });

  assertEquals(text, "https://acme.test");
});

Deno.test("missing or malformed rich text yields no lines", () => {
  assertEquals(richTextValueToLines(undefined), []);
  assertEquals(richTextValueToLines({}), []);
  assertEquals(richTextValueToLines({ elements: "nope" }), []);
  assertEquals(richTextValueToText({ type: "rich_text", elements: [] }), "");
});

const baseContext: TesEventContext = {
  channelId: "C123",
  projectName: "Acme",
  onboardingComplete: true,
  derivedComponents: [],
  dashboardCanvasId: "dash1",
  requirementsCanvasId: "req1",
  deliverablesListId: "list1",
  incidentsListId: "list2",
  infrastructureCanvasId: "infra1",
  situationReportCanvasId: "sr1",
  accountName: "Acme Corp",
};

Deno.test("Dashboard renders multi-entry stakeholders as a nested list", () => {
  const markdown = dashboardTemplate(baseContext, {
    accountName: "Acme Corp",
    mainProspectGoal: "Prove identity governance",
    dealHistory: "Renewal cycle",
    projectType: "Pilot",
    stakeholders: "Dana Vance (CISO)\nRavi Patel (IAM lead)",
    competitors: "Okta, Saviynt",
    sailpointSuite: "Identity Security Cloud",
    deadline: "2026-09-01",
    notes: "",
  });

  assertEquals(
    markdown.includes(
      "- **Stakeholders:** \n    - Dana Vance (CISO)\n    - Ravi Patel (IAM lead)",
    ),
    true,
  );
  assertEquals(
    markdown.includes("- **Goal:** Prove identity governance"),
    true,
  );
});
