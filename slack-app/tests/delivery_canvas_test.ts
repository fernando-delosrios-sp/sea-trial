import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import {
  clearDeliveryReviewFlag,
  consolidateDeliveryCanvasLocally,
  EXCERPT_PENDING,
  EXCERPT_REVIEW_PENDING,
  extractDeliveryExcerpt,
  isDeliveryReviewPending,
  shouldCreateDeliveryCanvas,
} from "../lib/delivery-canvas.ts";

const baseContext: TesEventContext = {
  channelId: "C123",
  projectName: "Acme Demo",
  onboardingComplete: true,
  derivedComponents: ["IdentityNow", "Access Manager"],
  dashboardCanvasId: "dash1",
  requirementsCanvasId: "req1",
  deliverablesListId: "list1",
  incidentsListId: "list2",
  infrastructureCanvasId: "infra1",
};

Deno.test("shouldCreateDeliveryCanvas true on Validation required without link", () => {
  assertEquals(shouldCreateDeliveryCanvas("Validation required"), true);
  assertEquals(shouldCreateDeliveryCanvas("Validation required", ""), true);
});

Deno.test("shouldCreateDeliveryCanvas false when deliverable already linked", () => {
  assertEquals(
    shouldCreateDeliveryCanvas("Validation required", "canvas:abc"),
    false,
  );
});

Deno.test("consolidation sets review flag and draft version", () => {
  const markdown = consolidateDeliveryCanvasLocally(
    {
      taskId: "TES-001",
      assigneeId: "U123",
      status: "Validation required",
      situation: "Testing",
      category: "SSO",
      requirements: "Configure SSO integration",
      openQuestions: "Which IdP?",
    },
    baseContext,
  );
  assertEquals(isDeliveryReviewPending(markdown), true);
  assertEquals(markdown.includes("Draft v1"), true);
  assertEquals(markdown.includes("Configure SSO integration"), true);
});

Deno.test("re-consolidation increments draft version", () => {
  const first = consolidateDeliveryCanvasLocally(
    {
      taskId: "TES-001",
      assigneeId: "U123",
      status: "Validation required",
      situation: "Testing",
      category: "SSO",
      requirements: "Configure SSO",
    },
    baseContext,
  );
  const second = consolidateDeliveryCanvasLocally(
    {
      taskId: "TES-001",
      assigneeId: "U123",
      status: "Validation required",
      situation: "Testing",
      category: "SSO",
      requirements: "Configure SSO",
    },
    baseContext,
    first,
  );
  assertEquals(second.includes("Draft v2"), true);
});

Deno.test("clearDeliveryReviewFlag removes banner and markers", () => {
  const draft = consolidateDeliveryCanvasLocally(
    {
      taskId: "TES-001",
      status: "Validation required",
      situation: "Testing",
      category: "SSO",
      requirements: "Configure SSO",
    },
    baseContext,
  );
  const cleared = clearDeliveryReviewFlag(draft);
  assertEquals(isDeliveryReviewPending(cleared), false);
  assertEquals(cleared.includes("_Agent-generated"), false);
});

Deno.test("extractDeliveryExcerpt pending when canvas missing", () => {
  assertEquals(extractDeliveryExcerpt(undefined), EXCERPT_PENDING);
});

Deno.test("extractDeliveryExcerpt review pending when flag set", () => {
  const draft = consolidateDeliveryCanvasLocally(
    {
      taskId: "TES-001",
      status: "Validation required",
      situation: "Testing",
      category: "SSO",
      requirements: "Configure SSO",
    },
    baseContext,
  );
  assertEquals(extractDeliveryExcerpt(draft), EXCERPT_REVIEW_PENDING);
});

Deno.test("extractDeliveryExcerpt from reviewed customer summary", () => {
  const draft = consolidateDeliveryCanvasLocally(
    {
      taskId: "TES-001",
      status: "Validation required",
      situation: "Testing",
      category: "SSO",
      requirements: "Configure SSO integration for Acme",
    },
    baseContext,
  );
  const reviewed = clearDeliveryReviewFlag(draft);
  const excerpt = extractDeliveryExcerpt(reviewed);
  assertEquals(excerpt.includes("Configure SSO"), true);
  assertEquals(excerpt !== EXCERPT_REVIEW_PENDING, true);
});

Deno.test("extractDeliveryExcerpt truncates at 500 characters", () => {
  const longSummary = "A".repeat(600);
  const markdown = [
    "# Delivery: TES-001",
    "",
    "## Customer summary",
    longSummary,
  ].join("\n");
  const excerpt = extractDeliveryExcerpt(markdown);
  assertEquals(excerpt.length <= 501, true);
  assertEquals(excerpt.endsWith("…"), true);
});

Deno.test("extractDeliveryExcerpt appends hero proof link", () => {
  const markdown = [
    "# Delivery: TES-001",
    "",
    "## Customer summary",
    "Delivery complete for SSO.",
    "",
    "## Visual proof",
    "Demo: https://example.com/proof.png",
  ].join("\n");
  const excerpt = extractDeliveryExcerpt(markdown);
  assertEquals(excerpt.includes("[Proof](https://example.com/proof.png)"), true);
});
