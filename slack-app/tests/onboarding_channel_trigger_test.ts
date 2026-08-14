import { assertEquals, assertRejects } from "std/assert/mod.ts";
import type { ListedTrigger } from "../lib/triggers-config.ts";
import {
  associateWorkflowWithChannel,
  provisionWorkflowChannelAssociation,
} from "../lib/onboarding-channel-trigger.ts";

const sharedTriggerId = "FtONBOARD123";
const dashboardCanvasId = "F_DASHBOARD";

function buildClient(
  handlers: {
    create?: (payload: Record<string, unknown>) => Promise<{
      ok: boolean;
      trigger?: { id?: string; share_url?: string };
      error?: string;
    }>;
    set?: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
    add?: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
    featured?: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  },
) {
  const createPayloads: Record<string, unknown>[] = [];
  const setPayloads: Record<string, unknown>[] = [];
  const addPayloads: Record<string, unknown>[] = [];
  const featuredPayloads: Record<string, unknown>[] = [];

  const client = {
    workflows: {
      triggers: {
        create: handlers.create
          ? async (payload: Record<string, unknown>) => {
            createPayloads.push(payload);
            return handlers.create!(payload);
          }
          : undefined,
        permissions: {
          set: async (payload: Record<string, unknown>) => {
            setPayloads.push(payload);
            return handlers.set
              ? handlers.set(payload)
              : { ok: true };
          },
          add: async (payload: Record<string, unknown>) => {
            addPayloads.push(payload);
            return handlers.add
              ? handlers.add(payload)
              : { ok: true };
          },
        },
      },
      featured: handlers.featured
        ? {
          add: async (payload: Record<string, unknown>) => {
            featuredPayloads.push(payload);
            return handlers.featured!(payload);
          },
        }
        : {
          add: async (payload: Record<string, unknown>) => {
            featuredPayloads.push(payload);
            return { ok: true };
          },
        },
    },
  };

  return { client, createPayloads, setPayloads, addPayloads, featuredPayloads };
}

Deno.test("provisionWorkflowChannelAssociation creates per-channel onboarding trigger for bookmark", async () => {
  const { client, createPayloads, setPayloads, addPayloads, featuredPayloads } = buildClient({
    create: async () => ({
      ok: true,
      trigger: { id: "FtCHANNEL123" },
    }),
    set: async () => ({ ok: true }),
    add: async () => ({ ok: true }),
    featured: async () => ({ ok: true }),
  });

  const url = await provisionWorkflowChannelAssociation(
    client,
    "C999",
    "open_onboarding_workflow",
    { bookmark: true },
    undefined,
    undefined,
    dashboardCanvasId,
  );

  assertEquals(url, "https://slack.com/shortcuts/FtCHANNEL123");
  assertEquals(createPayloads.length, 1);
  const inputs = createPayloads[0].inputs as Record<string, { value: unknown }>;
  assertEquals(inputs.channel_id.value, "C999");
  assertEquals(inputs.dashboard_canvas_id.value, dashboardCanvasId);
  assertEquals(setPayloads, [{
    trigger_id: "FtCHANNEL123",
    permission_type: "named_entities",
  }]);
  assertEquals(addPayloads, [{
    trigger_id: "FtCHANNEL123",
    channel_ids: ["C999"],
  }]);
  assertEquals(featuredPayloads, [{
    channel_id: "C999",
    trigger_ids: ["FtCHANNEL123"],
  }]);
});

Deno.test("provisionWorkflowChannelAssociation throws when dashboard canvas missing for bookmark", async () => {
  const { client } = buildClient({
    create: async () => ({ ok: true, trigger: { id: "FtCHANNEL123" } }),
    add: async () => ({ ok: true }),
  });

  await assertRejects(
    () =>
      provisionWorkflowChannelAssociation(
        client,
        "C999",
        "open_onboarding_workflow",
        { bookmark: true },
      ),
    Error,
    "requires dashboard canvas to be provisioned first",
  );
});

Deno.test("associateWorkflowWithChannel grants access and adds Workflows tab when bookmark", async () => {
  const { client, setPayloads, addPayloads, featuredPayloads } = buildClient({
    set: async () => ({ ok: true }),
    add: async () => ({ ok: true }),
    featured: async () => ({ ok: true }),
  });

  const url = await associateWorkflowWithChannel(
    client,
    "C999",
    sharedTriggerId,
    { bookmark: true },
  );

  assertEquals(url, `https://slack.com/shortcuts/${sharedTriggerId}`);
  assertEquals(setPayloads.length, 1);
  assertEquals(addPayloads.length, 1);
  assertEquals(featuredPayloads, [{
    channel_id: "C999",
    trigger_ids: [sharedTriggerId],
  }]);
});

Deno.test("associateWorkflowWithChannel calls workflows.featured.add when featured only", async () => {
  const { client, setPayloads, addPayloads, featuredPayloads } = buildClient({
    featured: async () => ({ ok: true }),
  });

  const url = await associateWorkflowWithChannel(
    client,
    "C999",
    sharedTriggerId,
    { featured: true },
  );

  assertEquals(url, `https://slack.com/shortcuts/${sharedTriggerId}`);
  assertEquals(setPayloads.length, 0);
  assertEquals(addPayloads.length, 0);
  assertEquals(featuredPayloads, [{
    channel_id: "C999",
    trigger_ids: [sharedTriggerId],
  }]);
});

Deno.test("provisionWorkflowChannelAssociation resolves shared trigger for featured only", async () => {
  const { client, featuredPayloads } = buildClient({
    featured: async () => ({ ok: true }),
  });

  const url = await provisionWorkflowChannelAssociation(
    client,
    "C999",
    "open_onboarding_workflow",
    { featured: true },
    { SLACK_ONBOARDING_TRIGGER_ID: sharedTriggerId },
  );

  assertEquals(url, `https://slack.com/shortcuts/${sharedTriggerId}`);
  assertEquals(featuredPayloads.length, 1);
});

Deno.test("provisionWorkflowChannelAssociation throws when trigger create fails", async () => {
  const { client } = buildClient({
    create: async () => ({ ok: false, error: "invalid_inputs" }),
  });

  await assertRejects(
    () =>
      provisionWorkflowChannelAssociation(
        client,
        "C999",
        "open_onboarding_workflow",
        { bookmark: true },
        {},
        undefined,
        dashboardCanvasId,
      ),
    Error,
    "Failed to create onboarding trigger for channel C999: invalid_inputs",
  );
});

Deno.test("provisionWorkflowChannelAssociation throws when shared trigger missing for featured", async () => {
  const { client } = buildClient({ featured: async () => ({ ok: true }) });

  await assertRejects(
    () =>
      provisionWorkflowChannelAssociation(
        client,
        "C999",
        "open_onboarding_workflow",
        { featured: true },
      ),
    Error,
    'Cannot resolve deploy-time trigger for workflow link "open_onboarding_workflow"',
  );
});

Deno.test("provisionWorkflowChannelAssociation throws for unknown workflow link", async () => {
  const { client } = buildClient({ add: async () => ({ ok: true }) });

  await assertRejects(
    () =>
      provisionWorkflowChannelAssociation(
        client,
        "C999",
        "unknown_workflow_link",
        { bookmark: true },
        { SLACK_ONBOARDING_TRIGGER_ID: sharedTriggerId },
        undefined,
        dashboardCanvasId,
      ),
    Error,
    'Unknown workflow link "unknown_workflow_link"',
  );
});

Deno.test("provisionWorkflowChannelAssociation falls back to trigger list for featured", async () => {
  const { client } = buildClient({ featured: async () => ({ ok: true }) });

  const listedTriggers: ListedTrigger[] = [{
    id: sharedTriggerId,
    title: "Complete Onboarding",
  }];

  const url = await provisionWorkflowChannelAssociation(
    client,
    "C999",
    "open_onboarding_workflow",
    { featured: true },
    {},
    listedTriggers,
  );

  assertEquals(url, `https://slack.com/shortcuts/${sharedTriggerId}`);
});
