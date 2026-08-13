import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { DeliverableProposal } from "@sea-trial/shared/types/index.ts";
import {
  formatOpenQuestions,
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
  openQuestions: ["Which IdP?", "VPN required?"],
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
  assertEquals(row.openQuestions, "Which IdP?; VPN required?");
});

Deno.test("formatOpenQuestions joins proposal questions for list column", () => {
  assertEquals(formatOpenQuestions(["A", "B"]), "A; B");
  assertEquals(formatOpenQuestions(undefined), "");
  assertEquals(formatOpenQuestions([]), "");
});

Deno.test("Candidate promoted on accept", () => {
  const canvas = "**TES-001** [candidate]: Configure SSO";
  const updated = markPromotedInCanvas(canvas, ["TES-001"]);
  assertEquals(updated.includes("promoted"), true);
});

Deno.test("Accept creates row without deliverable link", () => {
  const result = processAcceptProposals(
    [sampleProposal],
    "**TES-001** [candidate]: SSO",
    "U123",
  );
  assertEquals(result.rows.length, 1);
  assertEquals(result.rows[0].deliverable, "");
  assertEquals(result.rows[0].openQuestions, "Which IdP?; VPN required?");
  assertEquals(result.promotedTaskIds, ["TES-001"]);
});

Deno.test("No canvas for empty rows — reject produces zero rows", () => {
  assertEquals(shouldWriteToList("reject_proposals"), false);
  assertEquals(reviewActionMessage("reject_proposals", 0).includes("No deliverables"), true);
});

Deno.test("edit_proposals does not write to list", () => {
  assertEquals(shouldWriteToList(resolveReviewAction("edit_proposals")), false);
});

Deno.test("accept message mentions Validation required", () => {
  const message = reviewActionMessage("accept_proposals", 1);
  assertEquals(message.includes("Validation required"), true);
});
