import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { serializeEventContextSnapshot } from "../lib/event-context.ts";
import { createLogger, resetLoggerTestHooks, setLogSinkForTests } from "../lib/logger.ts";
import {
  agentUsageHelpMessage,
  materialsRedirectMessage,
  resolveAgentInvocationRoute,
  runInvokeAgentHandler,
} from "../lib/invoke-agent-handler.ts";

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

const baseInputs = {
  channel_id: "C1",
  user_id: "U1",
  message_ts: "1111.0001",
  thread_ts: "1111.0001",
  dashboard_canvas_content: serializeEventContextSnapshot(completeContext),
  requirements_canvas_content: "# Requirements",
  file_ids: [] as string[],
};

function mockClient() {
  return {
    token: "xoxb-test",
    files: {
      info: async () => ({ ok: false }),
    },
    chat: {
      postMessage: async () => ({ ts: "2222.0001" }),
    },
  };
}

Deno.test("invoke handler emits started and completed on success", async () => {
  resetLoggerTestHooks();
  const sink: Parameters<typeof setLogSinkForTests>[0] = [];
  setLogSinkForTests(sink);

  const logger = createLogger({ OTEL_LOGS_ENABLED: "true" }, "corr-handler-1");

  const result = await runInvokeAgentHandler(
    baseInputs,
    mockClient(),
    { AGENT_SERVICE_URL: "http://localhost:3000" },
    logger,
    {
      callAgent: async () => ({
        canvasMarkdown: "# Updated",
        proposals: [{
          taskId: "TES-001",
          category: "SSO",
          requirements: "Configure SSO",
          sourceDocRef: "doc",
          suggestedStatus: "Not started",
        }],
        agentMessage: "Done",
        needsClarification: false,
      }),
      replaceCanvas: async () => {},
    },
  );

  assertEquals(result, { outputs: { thread_ts: "2222.0001" } });
  assertEquals(sink.some((record) => record.eventName === "invoke.started"), true);
  assertEquals(sink.some((record) => record.eventName === "invoke.completed"), true);
  assertEquals(sink.every((record) => record.correlationId === "corr-handler-1"), true);

  resetLoggerTestHooks();
});

Deno.test("invoke handler emits failed when agent call throws", async () => {
  resetLoggerTestHooks();
  const sink: Parameters<typeof setLogSinkForTests>[0] = [];
  setLogSinkForTests(sink);

  const logger = createLogger({ OTEL_LOGS_ENABLED: "true" }, "corr-handler-2");

  await assertRejects(async () => {
    await runInvokeAgentHandler(
      baseInputs,
      mockClient(),
      { AGENT_SERVICE_URL: "http://localhost:3000" },
      logger,
      {
        callAgent: async () => {
          throw new Error("Agent unavailable");
        },
        replaceCanvas: async () => {},
      },
    );
  });

  assertEquals(sink.some((record) => record.eventName === "invoke.started"), true);
  assertEquals(sink.some((record) => record.eventName === "invoke.failed"), true);

  resetLoggerTestHooks();
});

Deno.test("invoke handler emits failed when agent URL missing", async () => {
  resetLoggerTestHooks();
  const sink: Parameters<typeof setLogSinkForTests>[0] = [];
  setLogSinkForTests(sink);

  const logger = createLogger({ OTEL_LOGS_ENABLED: "true" }, "corr-handler-3");

  const result = await runInvokeAgentHandler(
    baseInputs,
    mockClient(),
    {},
    logger,
  );

  assertEquals("error" in result && result.error.includes("AGENT_SERVICE_URL"), true);
  assertEquals(sink.some((record) => record.eventName === "invoke.failed"), true);
  assertEquals(sink.some((record) => record.eventName === "invoke.started"), false);

  resetLoggerTestHooks();
});

Deno.test("resolveAgentInvocationRoute routes Materials Drop thread replies to requirements", () => {
  const route = resolveAgentInvocationRoute({
    messageTs: "2000.0002",
    threadTs: "1000.0001",
    materialsDropMessageTs: "1000.0001",
  });
  assertEquals(route, { type: "requirements", threadTs: "1000.0001" });
});

Deno.test("resolveAgentInvocationRoute routes @Sea Trial requirements to requirements", () => {
  const route = resolveAgentInvocationRoute({
    text: "<@U123BOT> requirements analyze this document",
    messageTs: "2000.0001",
  });
  assertEquals(route, { type: "requirements", threadTs: "2000.0001" });
});

Deno.test("resolveAgentInvocationRoute routes @Sea Trial delivery to delivery", () => {
  const route = resolveAgentInvocationRoute({
    text: "@Sea Trial delivery consolidate draft",
    messageTs: "2000.0001",
  });
  assertEquals(route, { type: "delivery", threadTs: "2000.0001" });
});

Deno.test("resolveAgentInvocationRoute routes unrecognized @Sea Trial mention to help", () => {
  const route = resolveAgentInvocationRoute({
    text: "<@U123BOT> status update",
    messageTs: "2000.0001",
  });
  assertEquals(route, { type: "help", threadTs: "2000.0001" });
});

Deno.test("resolveAgentInvocationRoute ignores general channel chatter", () => {
  const route = resolveAgentInvocationRoute({
    text: "Can everyone join the call at 2pm?",
    messageTs: "2000.0001",
  });
  assertEquals(route, { type: "ignore" });
});

Deno.test("runInvokeAgentHandler fast-exits on non-target chatter without calling agent-service", async () => {
  const logger = createLogger({ OTEL_LOGS_ENABLED: "false" }, "corr-fast-exit");
  let agentCalled = false;

  const client = {
    ...mockClient(),
    apps: {
      datastore: {
        get: async () => ({
          ok: true,
          item: { channel_id: "C1", snapshot: serializeEventContextSnapshot(completeContext) },
        }),
      },
    },
  };

  const result = await runInvokeAgentHandler(
    {
      channel_id: "C1",
      user_id: "U1",
      message_ts: "3000.0001",
      text: "Normal chat message",
    },
    client,
    { AGENT_SERVICE_URL: "http://localhost:3000" },
    logger,
    {
      callAgent: async () => {
        agentCalled = true;
        throw new Error("Should not be called");
      },
    },
  );

  assertEquals(result, { outputs: { thread_ts: "3000.0001" } });
  assertEquals(agentCalled, false);
});

Deno.test("runInvokeAgentHandler posts help message on @Sea Trial mention without sub-command", async () => {
  const logger = createLogger({ OTEL_LOGS_ENABLED: "false" }, "corr-help");
  let postedText = "";

  const client = {
    ...mockClient(),
    chat: {
      postMessage: async (args: Record<string, unknown>) => {
        postedText = String(args.text ?? "");
        return { ts: "3000.0002" };
      },
    },
    apps: {
      datastore: {
        get: async () => ({
          ok: true,
          item: { channel_id: "C1", snapshot: serializeEventContextSnapshot(completeContext) },
        }),
      },
    },
  };

  const result = await runInvokeAgentHandler(
    {
      channel_id: "C1",
      user_id: "U1",
      message_ts: "3000.0001",
      text: "<@U123BOT> what can you do?",
    },
    client,
    { AGENT_SERVICE_URL: "http://localhost:3000" },
    logger,
  );

  assertEquals(result, { outputs: { thread_ts: "3000.0001" } });
  assertEquals(postedText.includes("Available Sea Trial agents"), true);
});

Deno.test("runInvokeAgentHandler invokes agent for Materials Drop thread reply", async () => {
  const logger = createLogger({ OTEL_LOGS_ENABLED: "false" }, "corr-materials-drop");
  let agentCalled = false;

  const contextWithDrop: TesEventContext = {
    ...completeContext,
    materialsDropMessageTs: "1000.0001",
  };

  const client = {
    ...mockClient(),
    apps: {
      datastore: {
        get: async () => ({
          ok: true,
          item: { channel_id: "C1", snapshot: serializeEventContextSnapshot(contextWithDrop) },
        }),
      },
    },
    canvases: {
      sections: {
        lookup: async () => ({
          ok: true,
          sections: [{ id: "sec1", markdown: "# Requirements Canvas" }],
        }),
      },
    },
  };

  const result = await runInvokeAgentHandler(
    {
      channel_id: "C1",
      user_id: "U1",
      message_ts: "1000.0002",
      thread_ts: "1000.0001",
      text: "Uploaded requirements notes",
    },
    client,
    { AGENT_SERVICE_URL: "http://localhost:3000" },
    logger,
    {
      callAgent: async () => {
        agentCalled = true;
        return {
          canvasMarkdown: "# Requirements\nUpdated",
          proposals: [{
            taskId: "TES-001",
            category: "Identity",
            requirements: "SCIM integration",
            sourceDocRef: "inline",
            suggestedStatus: "Not started",
          }],
          agentMessage: "Proposals ready",
          needsClarification: false,
        };
      },
      replaceCanvas: async () => {},
    },
  );

  assertEquals(result, { outputs: { thread_ts: "2222.0001" } });
  assertEquals(agentCalled, true);
});

Deno.test("resolveAgentInvocationRoute routes file attachments outside Materials Drop thread to redirect_materials", () => {
  const route = resolveAgentInvocationRoute({
    messageTs: "2000.0001",
    materialsDropMessageTs: "1000.0001",
    hasFiles: true,
  });
  assertEquals(route, { type: "redirect_materials", threadTs: "2000.0001" });
});

Deno.test("runInvokeAgentHandler posts redirect guidance when files uploaded in general chatter", async () => {
  const logger = createLogger({ OTEL_LOGS_ENABLED: "false" }, "corr-redirect");
  let postedText = "";

  const client = {
    ...mockClient(),
    chat: {
      postMessage: async (args: Record<string, unknown>) => {
        postedText = String(args.text ?? "");
        return { ts: "2000.0002" };
      },
    },
    apps: {
      datastore: {
        get: async () => ({
          ok: true,
          item: {
            snapshot: serializeEventContextSnapshot({
              ...completeContext,
              materialsDropMessageTs: "1000.0001",
            }),
          },
        }),
      },
    },
  };

  const result = await runInvokeAgentHandler(
    {
      channel_id: "C1",
      user_id: "U1",
      message_ts: "2000.0001",
      file_ids: ["F123"],
    },
    client,
    { AGENT_SERVICE_URL: "http://localhost:3000" },
    logger,
  );

  assertEquals(result, { outputs: { thread_ts: "2000.0001" } });
  assertEquals(postedText.includes("Materials & Requirements Drop"), true);
});


