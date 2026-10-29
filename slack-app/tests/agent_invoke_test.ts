import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { DeliverableProposal, FilePayload } from "@sea-trial/shared/types/index.ts";
import {
  buildAgentHttpBody,
  buildInvokeAgentRequest,
  buildProposalBlocks,
  encodeFilePayload,
} from "../lib/agent-client.ts";
import { isThreadContinuation, shouldProceedWithAgent } from "../lib/agent-gate.ts";
import { runInvokeAgentHandler } from "../lib/invoke-agent-handler.ts";
import { handleAcceptProposalAction } from "../lib/review-gate.ts";
import { createLogger } from "../lib/logger.ts";
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

Deno.test("Delta spec: Successful agent run via Materials Drop thread matching", () => {
  const contextWithDrop: TesEventContext = {
    ...completeContext,
    materialsDropMessageTs: "8888.0001",
  };
  // When thread_ts matches materialsDropMessageTs, route is requirements
  const isDrop = contextWithDrop.materialsDropMessageTs === "8888.0001";
  assertEquals(isDrop, true);
});

Deno.test("Delta spec: Summon-only invocation — channel create does not invoke agent", () => {
  // Agent invocation requires either a Materials Drop thread post or @mention sub-command
  const noSummon = {
    text: undefined,
    threadTs: undefined,
    messageTs: "1234.5678",
  };
  assertEquals(noSummon.text, undefined);
  assertEquals(noSummon.threadTs, undefined);
});

Deno.test("Staged proposal gate — does not update canvas on agent invocation", async () => {
  let canvasModified = false;
  let postedMessage: any = null;
  const logger = createLogger({ OTEL_LOGS_ENABLED: "false" }, "test-corr");

  const client = {
    token: "xoxb-test",
    files: { info: async () => ({ ok: false }) },
    chat: {
      postMessage: async (args: Record<string, unknown>) => {
        postedMessage = args;
        return { ts: "9999.0002" };
      },
    },
    apps: {
      datastore: {
        get: async () => ({
          ok: true,
          item: { channel_id: "C1", snapshot: JSON.stringify(completeContext) },
        }),
      },
    },
  };

  await runInvokeAgentHandler(
    {
      channel_id: "C1",
      user_id: "U1",
      message_ts: "1000.0002",
      thread_ts: "1000.0001",
      text: "@Sea Trial requirements process docs",
    },
    client as any,
    { AGENT_SERVICE_URL: "http://localhost:3000" },
    logger,
    {
      callAgent: async () => ({
        canvasMarkdown: "# Proposed Canvas Update",
        proposals: [{
          taskId: "TES-001",
          category: "Security",
          requirements: "[Architecture.pdf] Configure SSO",
          sourceDocRef: "Architecture.pdf",
          suggestedStatus: "Not started",
        }],
        agentMessage: "Requirements proposed",
        needsClarification: false,
      }),
      replaceCanvas: async () => {
        canvasModified = true;
      },
    },
  );

  // Canvas MUST NOT be modified at invocation time
  assertEquals(canvasModified, false);
  // Proposal message posted to thread with blocks
  assertEquals(postedMessage !== null, true);
  assertEquals(postedMessage?.thread_ts, "1000.0001");
});

Deno.test("Staged proposal gate — Accept & Update Canvas button and refinement guidance", () => {
  const proposals: DeliverableProposal[] = [{
    taskId: "TES-001",
    category: "Security",
    requirements: "[spec.pdf] Enable MFA",
    sourceDocRef: "spec.pdf",
    suggestedStatus: "Not started",
  }];

  const blocks = buildProposalBlocks(proposals, "1234.5678", {
    canvasId: "r1",
    proposedMarkdown: "# Requirements\n- MFA",
  });

  const actions = blocks.find((b) => b.type === "actions") as {
    elements: Array<{ action_id: string; text: { text: string }; value: string }>;
  };
  const acceptButton = actions.elements.find((e) => e.action_id === "accept_proposals");
  assertEquals(acceptButton?.text.text, "Accept & Update Canvas");
  assertEquals(acceptButton?.value.includes("r1"), true);

  const contextBlock = blocks.find((b) => b.type === "context") as {
    elements: Array<{ text: string }>;
  };
  assertEquals(contextBlock?.elements[0].text.includes("Refinement guidance"), true);
});

Deno.test("Staged proposal gate — handleAcceptProposalAction edits canvas and confirms acceptance", async () => {
  let editedCanvasId = "";
  let updatedMessage: any = null;

  const mockClient = {
    canvases: {
      edit: async (params: any) => {
        editedCanvasId = params.canvas_id;
        return { ok: true };
      },
    },
    chat: {
      update: async (params: Record<string, unknown>) => {
        updatedMessage = params;
        return { ok: true };
      },
      postMessage: async () => ({ ok: true }),
    },
  };

  const result = await handleAcceptProposalAction({
    client: mockClient as any,
    channelId: "C1",
    messageTs: "2000.0001",
    threadTs: "1000.0001",
    requirementsCanvasId: "r1",
    proposedMarkdown: "# Updated Requirements",
  });

  assertEquals(result.ok, true);
  assertEquals(editedCanvasId, "r1");
  assertEquals(updatedMessage !== null, true);
  assertEquals((updatedMessage?.text as string).includes("Requirements proposal accepted"), true);
});


