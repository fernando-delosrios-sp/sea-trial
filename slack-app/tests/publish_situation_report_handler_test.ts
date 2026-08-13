import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { runPublishSituationReport } from "../lib/publish-situation-report-handler.ts";
import type { PublishSituationReportClient } from "../lib/publish-situation-report-handler.ts";
import { parseGeneratedAt } from "../lib/situation-report.ts";

const baseContext: TesEventContext = {
  channelId: "C123",
  projectName: "Acme Demo",
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

function buildMockClient(options: {
  listItems?: Array<Record<string, string>>;
  priorCanvasMarkdown?: string;
}) {
  let replacedMarkdown = "";

  return {
    client: {
      slackLists: {
        items: {
          list: async () => ({
            items: (options.listItems ?? []).map((fields) => ({
              fields: Object.entries(fields).map(([column_id, value]) => ({
                column_id,
                value,
              })),
            })),
          }),
        },
      },
      canvases: {
        sections: {
          lookup: async () => ({
            sections: options.priorCanvasMarkdown
              ? [{ id: "s1", markdown: options.priorCanvasMarkdown }]
              : [],
          }),
        },
        edit: async (params: {
          changes: Array<{ document_content?: { markdown: string } }>;
        }) => {
          replacedMarkdown = params.changes[0]?.document_content?.markdown ?? "";
        },
      },
    },
    getReplacedMarkdown: () => replacedMarkdown,
  };
}

Deno.test("runPublishSituationReport rejects when onboarding incomplete", async () => {
  const { client } = buildMockClient({});
  const result = await runPublishSituationReport(client as PublishSituationReportClient, {
    ...baseContext,
    onboardingComplete: false,
  });
  assertEquals(result.ok, false);
  assertEquals(result.error?.includes("onboarding"), true);
});

Deno.test("runPublishSituationReport reads list and updates situation report canvas", async () => {
  const priorMarkdown = [
    "# Situation Report — Acme Demo",
    "**Generated:** 2026-08-05",
    "## Executive summary",
    "2 deliverable(s) tracked.",
  ].join("\n");

  const { client, getReplacedMarkdown } = buildMockClient({
    listItems: [{
      task_id: "TES-001",
      status: "Blocked",
      situation: "Waiting on VPN",
      category: "Connectors",
      open_questions: "Which vendor?",
      deliverable: "https://example.com/d/demo",
    }],
    priorCanvasMarkdown: priorMarkdown,
  });

  const result = await runPublishSituationReport(
    client as PublishSituationReportClient,
    baseContext,
  );
  assertEquals(result.ok, true);

  const markdown = getReplacedMarkdown();
  assertEquals(Boolean(parseGeneratedAt(markdown)), true);
  assertEquals(markdown.includes("#### TES-001 — Needs your input"), true);
  assertEquals(markdown.includes("Which vendor?"), true);
  assertEquals(markdown.includes("2026-08-05"), true);
  assertEquals(markdown.includes("Assignee"), false);
});

Deno.test("runPublishSituationReport rejects missing situation report canvas", async () => {
  const { client } = buildMockClient({});
  const result = await runPublishSituationReport(client as PublishSituationReportClient, {
    ...baseContext,
    situationReportCanvasId: "",
  });
  assertEquals(result.ok, false);
  assertEquals(result.error?.includes("Situation Report"), true);
});
