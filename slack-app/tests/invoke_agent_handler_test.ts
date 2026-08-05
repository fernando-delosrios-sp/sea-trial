import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@tes/shared/types/index.ts";
import { serializeEventContext } from "../lib/event-context.ts";
import { createLogger, resetLoggerTestHooks, setLogSinkForTests } from "../lib/logger.ts";
import { runInvokeAgentHandler } from "../lib/invoke-agent-handler.ts";

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

const baseInputs = {
  channel_id: "C1",
  user_id: "U1",
  message_ts: "1111.0001",
  thread_ts: "1111.0001",
  dashboard_canvas_content: serializeEventContext(completeContext),
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

