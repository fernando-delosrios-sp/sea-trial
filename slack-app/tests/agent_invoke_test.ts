import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { DeliverableProposal } from "@tes/shared/types/index.ts";
import { buildProposalBlocks } from "../lib/agent-client.ts";
import { isThreadContinuation, shouldProceedWithAgent } from "../lib/agent-gate.ts";
import type { TesEventContext } from "@tes/shared/types/index.ts";

const completeContext: TesEventContext = {
  channelId: "C1",
  projectName: "Acme",
  onboardingComplete: true,
  derivedComponents: ["IdentityNow"],
  dashboardCanvasId: "d1",
  requirementsCanvasId: "r1",
  deliverablesListId: "l1",
  incidentsListId: "l2",
  infrastructureCanvasId: "i1",
};

Deno.test("Slack adapter — shouldProceedWithAgent gates on onboarding", () => {
  assertEquals(shouldProceedWithAgent(completeContext), true);
  assertEquals(
    shouldProceedWithAgent({ ...completeContext, onboardingComplete: false }),
    false,
  );
});

Deno.test("Successful agent run — buildProposalBlocks includes Accept/Reject", () => {
  const proposals: DeliverableProposal[] = [{
    taskId: "TES-001",
    category: "SSO",
    requirements: "Configure SSO",
    sourceDocRef: "doc",
    suggestedStatus: "Not started",
  }];
  const blocks = buildProposalBlocks(proposals, "1234.5678");
  const actions = blocks.find((b) => b.type === "actions") as {
    elements: Array<{ action_id: string }>;
  };
  const actionIds = actions.elements.map((e) => e.action_id);
  assertEquals(actionIds.includes("accept_proposals"), true);
  assertEquals(actionIds.includes("reject_proposals"), true);
});

Deno.test("Multi-turn thread continuation — isThreadContinuation detects replies", () => {
  assertEquals(isThreadContinuation("1234.5678", "1234.0001"), true);
  assertEquals(isThreadContinuation("1234.5678", "1234.5678"), false);
  assertEquals(isThreadContinuation("1234.5678", undefined), false);
});
