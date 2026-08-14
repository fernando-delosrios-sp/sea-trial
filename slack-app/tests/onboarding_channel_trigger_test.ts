import { assertEquals, assertRejects } from "std/assert/mod.ts";
import type { ListedTrigger } from "../lib/triggers-config.ts";
import {
  associateWorkflowWithChannel,
  provisionWorkflowChannelAssociation,
} from "../lib/onboarding-channel-trigger.ts";

const sharedTriggerId = "FtONBOARD123";

function buildClient(
  handlers: {
    set?: (payload: Record<string, unknown>) => Promise<{ ok: boolean }>;
    add?: (payload: Record<string, unknown>) => Promise<{ ok: boolean }>;
    featured?: (payload: Record<string, unknown>) => Promise<{ ok: boolean }>;
  },
) {
  const setPayloads: Record<string, unknown>[] = [];
  const addPayloads: Record<string, unknown>[] = [];
  const featuredPayloads: Record<string, unknown>[] = [];

  const client = {
    workflows: {
      triggers: {
        permissions: {
          set: handlers.set
            ? async (payload: Record<string, unknown>) => {
              setPayloads.push(payload);
              return handlers.set!(payload);
            }
            : undefined,
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
        : undefined,
    },
  };

  return { client, setPayloads, addPayloads, featuredPayloads };
}

Deno.test("associateWorkflowWithChannel grants bookmark access without creating trigger", async () => {
  const { client, setPayloads, addPayloads } = buildClient({
    set: async () => ({ ok: true }),
    add: async () => ({ ok: true }),
  });

  const url = await associateWorkflowWithChannel(
    client,
    "C999",
    sharedTriggerId,
    { bookmark: true },
  );

  assertEquals(url, `https://slack.com/shortcuts/${sharedTriggerId}`);
  assertEquals(setPayloads, [{
    trigger_id: sharedTriggerId,
    permission_type: "named_entities",
  }]);
  assertEquals(addPayloads, [{
    trigger_id: sharedTriggerId,
    channel_ids: ["C999"],
  }]);
});

Deno.test("provisionWorkflowChannelAssociation resolves shared trigger from env", async () => {
  const { client, addPayloads } = buildClient({
    set: async () => ({ ok: true }),
    add: async () => ({ ok: true }),
  });

  const url = await provisionWorkflowChannelAssociation(
    client,
    "C999",
    "open_onboarding_workflow",
    { bookmark: true },
    { SLACK_ONBOARDING_TRIGGER_ID: sharedTriggerId },
  );

  assertEquals(url, `https://slack.com/shortcuts/${sharedTriggerId}`);
  assertEquals(addPayloads.length, 1);
  assertEquals(addPayloads[0].channel_ids, ["C999"]);
});

Deno.test("provisionWorkflowChannelAssociation resolves shared trigger from trigger list", async () => {
  const { client, addPayloads } = buildClient({
    set: async () => ({ ok: true }),
    add: async () => ({ ok: true }),
  });

  const listedTriggers: ListedTrigger[] = [{
    id: sharedTriggerId,
    title: "Complete Onboarding",
  }];

  const url = await provisionWorkflowChannelAssociation(
    client,
    "C999",
    "open_onboarding_workflow",
    { bookmark: true },
    {},
    listedTriggers,
  );

  assertEquals(url, `https://slack.com/shortcuts/${sharedTriggerId}`);
  assertEquals(addPayloads.length, 1);
});

Deno.test("associateWorkflowWithChannel calls workflows.featured.add when featured", async () => {
  const { client, featuredPayloads } = buildClient({
    add: async () => ({ ok: true }),
    featured: async () => ({ ok: true }),
  });

  const url = await associateWorkflowWithChannel(
    client,
    "C999",
    sharedTriggerId,
    { featured: true },
  );

  assertEquals(url, `https://slack.com/shortcuts/${sharedTriggerId}`);
  assertEquals(featuredPayloads, [{
    channel_id: "C999",
    trigger_ids: [sharedTriggerId],
  }]);
});

Deno.test("provisionWorkflowChannelAssociation throws when trigger id missing and bookmark requested", async () => {
  const { client } = buildClient({ add: async () => ({ ok: true }) });

  await assertRejects(
    () =>
      provisionWorkflowChannelAssociation(
        client,
        "C999",
        "open_onboarding_workflow",
        { bookmark: true },
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
      ),
    Error,
    'Unknown workflow link "unknown_workflow_link"',
  );
});
