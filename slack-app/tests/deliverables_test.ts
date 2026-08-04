import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { DeliverableProposal } from "@tes/shared/types/index.ts";
import {
  buildDeliveryTemplateContent,
  markPromotedInCanvas,
  proposalToRowInput,
} from "../lib/deliverables.ts";
import {
  processAcceptProposals,
  resolveReviewAction,
  reviewActionMessage,
  shouldWriteToList,
} from "../lib/review-gate.ts";

const sampleProposal: DeliverableProposal = {
  taskId: "TES-001",
  category: "SSO",
  requirements: "Configure SSO integration",
  sourceDocRef: "req.txt",
  suggestedStatus: "Not started",
};

Deno.test("Accept creates list item — shouldWriteToList true for accept", () => {
  assertEquals(shouldWriteToList("accept_proposals"), true);
});

Deno.test("Reject does not write — shouldWriteToList false for reject", () => {
  assertEquals(shouldWriteToList("reject_proposals"), false);
});

Deno.test("No write without interaction — shouldWriteToList false for none", () => {
  assertEquals(shouldWriteToList("none"), false);
});

Deno.test("Core fields populated on accept", () => {
  const row = proposalToRowInput(sampleProposal, "U123");
  assertEquals(row.taskId, "TES-001");
  assertEquals(row.category, "SSO");
  assertEquals(row.status, "Not started");
  assertEquals(row.assigneeId, "U123");
});

Deno.test("Candidate promoted on accept", () => {
  const canvas = "**TES-001** [candidate]: Configure SSO";
  const updated = markPromotedInCanvas(canvas, ["TES-001"]);
  assertEquals(updated.includes("promoted"), true);
});

Deno.test("Canvas created on accept — delivery template content", () => {
  const content = buildDeliveryTemplateContent(sampleProposal, "excerpt");
  assertEquals(content.includes("TES-001"), true);
  assertEquals(content.includes("Configure SSO"), true);
});

Deno.test("No canvas for empty rows — reject produces zero rows", () => {
  assertEquals(shouldWriteToList("reject_proposals"), false);
  assertEquals(reviewActionMessage("reject_proposals", 0).includes("No deliverables"), true);
});

Deno.test("processAcceptProposals builds rows and promotes candidates", () => {
  const result = processAcceptProposals(
    [sampleProposal],
    "**TES-001** [candidate]: SSO",
    "U123",
    ["canvas-1"],
  );
  assertEquals(result.rows.length, 1);
  assertEquals(result.rows[0].deliverable, "canvas:canvas-1");
  assertEquals(result.promotedTaskIds, ["TES-001"]);
});

Deno.test("edit_proposals does not write to list", () => {
  assertEquals(shouldWriteToList(resolveReviewAction("edit_proposals")), false);
});
