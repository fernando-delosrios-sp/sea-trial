import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { DeliverableProposal, FilePayload } from "@sea-trial/shared/types/index.ts";
import {
  buildAgentHttpBody,
  buildInvokeAgentRequest,
  buildProposalBlocks,
  encodeFilePayload,
} from "../lib/agent-client.ts";
import { isThreadContinuation, shouldProceedWithAgent } from "../lib/agent-gate.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";

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
  situationReportCanvasId: "sr1",
};

const priorCanvas =
  "# Requirements\n\n## Session Log\n- **2026-01-01:** First run.\n";

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
  assertEquals(actionIds.includes("reject_projects"), false);
  assertEquals(actionIds.includes("reject_proposals"), true);
});

Deno.test("Multi-turn thread continuation — isThreadContinuation detects replies", () => {
  assertEquals(isThreadContinuation("1234.5678", "1234.0001"), true);
  assertEquals(isThreadContinuation("1234.5678", "1234.5678"), false);
  assertEquals(isThreadContinuation("1234.5678", undefined), false);
});

Deno.test("FilePayload — encodeFilePayload produces base64 raw bytes", () => {
  const content = new TextEncoder().encode("Deliverable: SSO setup");
  const payload: FilePayload = {
    filename: "req.txt",
    mimeType: "text/plain",
    contentBase64: encodeFilePayload(content),
  };
  assertEquals(payload.contentBase64.length > 0, true);
  assertEquals(atob(payload.contentBase64), "Deliverable: SSO setup");
});

Deno.test("Slack adapter — buildAgentHttpBody sends FilePayload without parsing", () => {
  const downloaded = new TextEncoder().encode("Deliverable: from Slack download");
  const body = buildAgentHttpBody(
    buildInvokeAgentRequest(
      completeContext,
      priorCanvas,
      [{
        filename: "requirements.txt",
        mimeType: "text/plain",
        content: downloaded,
      }],
      "1234.5678",
    ),
  );

  assertEquals(body.files.length, 1);
  assertEquals(body.files[0].filename, "requirements.txt");
  assertEquals(atob(body.files[0].contentBase64), "Deliverable: from Slack download");
  assertEquals(body.requirementsCanvasMarkdown, priorCanvas);
  assertEquals(body.threadHistory, "1234.5678");
});

Deno.test("Slack adapter — no parser library imports in agent-client", async () => {
  const source = await Deno.readTextFile(
    new URL("../lib/agent-client.ts", import.meta.url),
  );
  assertEquals(source.includes("mammoth"), false);
  assertEquals(source.includes("xlsx"), false);
  assertEquals(source.includes("pdf-parse"), false);
  assertEquals(source.includes("parseDocument"), false);
});

Deno.test("Task memory — buildInvokeAgentRequest passes full Requirements Canvas", () => {
  const request = buildInvokeAgentRequest(
    completeContext,
    priorCanvas,
    [],
    "9999.0001",
  );
  assertEquals(request.requirementsCanvasMarkdown.includes("First run"), true);
  assertEquals(request.threadHistory, "9999.0001");
});

Deno.test("Slack adapter — invoke flow uses buildInvokeAgentRequest", async () => {
  const source = await Deno.readTextFile(
    new URL("../lib/invoke-agent-handler.ts", import.meta.url),
  );
  assertEquals(source.includes("buildInvokeAgentRequest"), true);
  assertEquals(source.includes("invoke.started"), true);
  assertEquals(source.includes("invoke.completed"), true);
});

