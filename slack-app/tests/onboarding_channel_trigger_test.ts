import { assertEquals, assertStringIncludes } from "std/assert/mod.ts";
import { serializeEventContext } from "../lib/event-context.ts";
import { provisionOnboardingChannelShortcut } from "../lib/onboarding-channel-trigger.ts";

const snapshot = serializeEventContext({
  channelId: "C999",
  projectName: "Demo",
  onboardingComplete: false,
  derivedComponents: [],
  dashboardCanvasId: "dash-canvas-1",
  requirementsCanvasId: "req-1",
  deliverablesListId: "list-1",
  incidentsListId: "list-2",
  infrastructureCanvasId: "infra-1",
  situationReportCanvasId: "sr-1",
  accountName: "Acme Corp",
});

Deno.test("provisionOnboardingChannelShortcut creates trigger and grants channel access", async () => {
  const createPayloads: Record<string, unknown>[] = [];
  const accessPayloads: Record<string, unknown>[] = [];

  const url = await provisionOnboardingChannelShortcut(
    {
      workflows: {
        triggers: {
          create: async (payload) => {
            createPayloads.push(payload);
            return {
              ok: true,
              trigger: {
                id: "FtONBOARD123",
                share_url: "https://slack.com/shortcuts/FtONBOARD123/abc",
              },
            };
          },
          permissions: {
            add: async (payload) => {
              accessPayloads.push(payload);
              return { ok: true };
            },
          },
        },
      },
    },
    "C999",
    "dash-canvas-1",
    snapshot,
  );

  assertEquals(url, "https://slack.com/shortcuts/FtONBOARD123/abc");
  assertEquals(createPayloads.length, 1);
  assertEquals(createPayloads[0].name, "Complete Onboarding");
  assertEquals(
    createPayloads[0].workflow,
    "#/workflows/open_onboarding_workflow",
  );
  assertEquals(
    (createPayloads[0].inputs as Record<string, { value: string }>).channel_id
      .value,
    "C999",
  );
  assertEquals(
    (createPayloads[0].inputs as Record<string, { value: string }>)
      .dashboard_canvas_id.value,
    "dash-canvas-1",
  );
  const content = (createPayloads[0].inputs as Record<string, { value: string }>)
    .dashboard_canvas_content.value;
  assertStringIncludes(content, "dash-canvas-1");
  assertStringIncludes(content, "Acme Corp");
  assertEquals(accessPayloads, [{
    trigger_id: "FtONBOARD123",
    channel_ids: ["C999"],
  }]);
});

Deno.test("provisionOnboardingChannelShortcut returns undefined when create fails", async () => {
  const url = await provisionOnboardingChannelShortcut(
    {
      workflows: {
        triggers: {
          create: async () => ({ ok: false, error: "denied" }),
          permissions: {
            add: async () => ({ ok: true }),
          },
        },
      },
    },
    "C999",
    "dash-canvas-1",
    snapshot,
  );

  assertEquals(url, undefined);
});
