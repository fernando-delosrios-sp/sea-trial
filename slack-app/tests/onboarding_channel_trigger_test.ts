import { assertEquals } from "std/assert/assert_equals.ts";
import { provisionOnboardingChannelShortcut } from "../lib/onboarding-channel-trigger.ts";

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
  );

  assertEquals(url, undefined);
});
