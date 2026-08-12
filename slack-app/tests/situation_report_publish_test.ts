import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { DeliverableStatus, TesEventContext } from "@tes/shared/types/index.ts";
import {
  buildSituationReportMarkdown,
  parseChangelogRows,
  parseGeneratedAt,
  projectCustomerFields,
  resetSituationReportCacheForTests,
} from "../lib/situation-report.ts";
import {
  clearDeliveryReviewFlag,
  consolidateDeliveryCanvasLocally,
  EXCERPT_PENDING,
  EXCERPT_REVIEW_PENDING,
} from "../lib/delivery-canvas.ts";

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

const sampleRows = [
  {
    taskId: "TES-001",
    internalStatus: "Blocked" as DeliverableStatus,
    situation: "Waiting on customer VPN details",
    category: "Connectors",
    deliverableUrl: "https://example.com/delivery",
    openQuestions: "Which VPN vendor?",
  },
  {
    taskId: "TES-002",
    internalStatus: "Accepted" as DeliverableStatus,
    situation: "Demo recorded",
    category: "Workflows",
    openQuestions: "",
  },
];

Deno.test("first publish sets Generated date and customer fields", () => {
  resetSituationReportCacheForTests();
  const markdown = buildSituationReportMarkdown(baseContext, sampleRows, {
    generatedAt: "2026-08-12",
  });

  assertEquals(parseGeneratedAt(markdown), "2026-08-12");
  assertEquals(markdown.includes("#### TES-001 — Needs your input"), true);
  assertEquals(markdown.includes("Waiting on customer VPN details"), true);
  assertEquals(markdown.includes("Which VPN vendor?"), true);
  assertEquals(markdown.includes("Assignee"), false);
  assertEquals(markdown.includes("Requirements"), false);
  assertEquals(markdown.includes("Blocked"), false);
});

Deno.test("subsequent publish appends changelog row", () => {
  resetSituationReportCacheForTests();
  const first = buildSituationReportMarkdown(baseContext, sampleRows, {
    generatedAt: "2026-08-05",
  });

  const second = buildSituationReportMarkdown(baseContext, sampleRows, {
    generatedAt: "2026-08-12",
    previousMarkdown: first,
  });

  const changelog = parseChangelogRows(second);
  assertEquals(changelog.length >= 1, true);
  assertEquals(changelog[0].date, "2026-08-05");
  assertEquals(parseGeneratedAt(second), "2026-08-12");
});

Deno.test("Blocked maps to Needs your input via projectCustomerFields", () => {
  const projected = projectCustomerFields(sampleRows[0]);
  assertEquals(projected.customer_status, "Needs your input");
  assertEquals(projected.task_id, "TES-001");
});

Deno.test("delivery excerpt pending when canvas markdown missing", () => {
  resetSituationReportCacheForTests();
  const markdown = buildSituationReportMarkdown(baseContext, sampleRows, {
    generatedAt: "2026-08-12",
  });
  assertEquals(
    markdown.includes(`**Delivery excerpt:** ${EXCERPT_PENDING}`),
    true,
  );
});

Deno.test("delivery excerpt from reviewed customer summary", () => {
  resetSituationReportCacheForTests();
  const deliveryMarkdown = clearDeliveryReviewFlag(
    consolidateDeliveryCanvasLocally(
      {
        taskId: "TES-001",
        status: "Validation required",
        situation: "Waiting on customer VPN details",
        category: "Connectors",
        requirements: "Configure connector for Acme VPN",
      },
      baseContext,
    ),
  );

  const rowsWithCanvas = [{
    ...sampleRows[0],
    deliveryCanvasMarkdown: deliveryMarkdown,
  }];

  const markdown = buildSituationReportMarkdown(baseContext, rowsWithCanvas, {
    generatedAt: "2026-08-12",
  });
  assertEquals(markdown.includes("Configure connector"), true);
  assertEquals(markdown.includes(EXCERPT_REVIEW_PENDING), false);
});

Deno.test("delivery excerpt review pending when flag set", () => {
  resetSituationReportCacheForTests();
  const deliveryMarkdown = consolidateDeliveryCanvasLocally(
    {
      taskId: "TES-001",
      status: "Validation required",
      situation: "Waiting",
      category: "Connectors",
      requirements: "Configure connector",
    },
    baseContext,
  );

  const rowsWithCanvas = [{
    ...sampleRows[0],
    deliveryCanvasMarkdown: deliveryMarkdown,
  }];

  const markdown = buildSituationReportMarkdown(baseContext, rowsWithCanvas, {
    generatedAt: "2026-08-12",
  });
  assertEquals(
    markdown.includes(`**Delivery excerpt:** ${EXCERPT_REVIEW_PENDING}`),
    true,
  );
});

Deno.test("items grouped under category headings", () => {
  resetSituationReportCacheForTests();
  const markdown = buildSituationReportMarkdown(baseContext, sampleRows, {
    generatedAt: "2026-08-12",
  });
  assertEquals(markdown.includes("### Connectors"), true);
  assertEquals(markdown.includes("### Workflows"), true);
});
