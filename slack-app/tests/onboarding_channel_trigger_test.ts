import { assertEquals, assertRejects } from "std/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { serializeEventContextSnapshot } from "../lib/event-context.ts";
import {
  provisionWorkflowChannelAssociation,
  withOnboardingTriggerIdentity,
} from "../lib/onboarding-channel-trigger.ts";

const dashboardCanvasId = "F_DASHBOARD";
const shareUrl = "https://slack.com/shortcuts/FtNEWCHANNEL/secret";

const seedContext: TesEventContext = {
  channelId: "C999",
  projectName: "Acme",
  onboardingComplete: false,
  derivedComponents: [],
  dashboardCanvasId,
  requirementsCanvasId: "req1",
  deliverablesListId: "list1",
  incidentsListId: "list2",
  infrastructureCanvasId: "infra1",
  situationReportCanvasId: "sr1",
  accountName: "Acme Corp",
};

function buildClient(
  handlers: {
    create?: (payload: Record<string, unknown>) => Promise<{
      ok: boolean;
      trigger?: {
        id?: string;
        trigger_id?: string;
        share_url?: string;
        shortcut_url?: string;
      };
      error?: string;
    }>;
    update?: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
    set?: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
    add?: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
    featured?: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  },
) {
  const createPayloads: Record<string, unknown>[] = [];
  const updatePayloads: Record<string, unknown>[] = [];
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
        update: async (payload: Record<string, unknown>) => {
          updatePayloads.push(payload);
          return handlers.update ? handlers.update(payload) : { ok: true };
        },
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
      featured: {
        add: async (payload: Record<string, unknown>) => {
          featuredPayloads.push(payload);
          return handlers.featured
            ? handlers.featured(payload)
            : { ok: true };
        },
      },
    },
  };

  return { client, createPayloads, updatePayloads, setPayloads, addPayloads, featuredPayloads };
}

Deno.test("Onboarding trigger resolved at provision — create is called once with baked inputs and distinct title", async () => {
  const { client, createPayloads, updatePayloads, setPayloads, addPayloads, featuredPayloads } =
    buildClient({
      create: async () => ({
        ok: true,
        trigger: { id: "FtNEWCHANNEL", share_url: shareUrl },
      }),
      add: async () => ({ ok: true }),
    });

  const result = await provisionWorkflowChannelAssociation(
    client,
    "C999",
    "open_onboarding_workflow",
    dashboardCanvasId,
    seedContext,
  );

  assertEquals(result.shareUrl, shareUrl);
  assertEquals(result.triggerId, "FtNEWCHANNEL");
  assertEquals(createPayloads.length, 1);
  assertEquals(createPayloads[0]?.name, "Complete Onboarding (C999)");
  const inputs = createPayloads[0]?.inputs as Record<string, { value: string }>;
  assertEquals(inputs.channel_id.value, "C999");
  assertEquals(inputs.dashboard_canvas_id.value, dashboardCanvasId);
  assertEquals(
    inputs.dashboard_canvas_content.value,
    serializeEventContextSnapshot(seedContext),
  );
  assertEquals(typeof inputs.interactivity.value, "object");
  assertEquals(updatePayloads.length, 1);
  const updatedInputs = updatePayloads[0]?.inputs as Record<string, { value: string }>;
  assertEquals(
    updatedInputs.dashboard_canvas_content.value,
    serializeEventContextSnapshot(
      withOnboardingTriggerIdentity(seedContext, {
        triggerId: "FtNEWCHANNEL",
        shareUrl,
      }),
    ),
  );
  assertEquals(setPayloads.length, 0);
  assertEquals(addPayloads, [{
    trigger_id: "FtNEWCHANNEL",
    channel_ids: ["C999"],
  }]);
  assertEquals(featuredPayloads.length, 0);
});

Deno.test("Onboarding trigger resolved at provision — accepts trigger_id and shortcut_url", async () => {
  const { client, addPayloads } = buildClient({
    create: async () => ({
      ok: true,
      trigger: {
        trigger_id: "FtALT",
        shortcut_url: "https://slack.com/shortcuts/FtALT/secret",
      },
    }),
    add: async () => ({ ok: true }),
  });

  const result = await provisionWorkflowChannelAssociation(
    client,
    "C888",
    "open_onboarding_workflow",
    dashboardCanvasId,
    { ...seedContext, channelId: "C888" },
  );

  assertEquals(result.shareUrl, "https://slack.com/shortcuts/FtALT/secret");
  assertEquals(result.triggerId, "FtALT");
  assertEquals(addPayloads[0]?.trigger_id, "FtALT");
});

Deno.test("Missing dashboard canvas fails onboarding trigger create", async () => {
  const { client } = buildClient({
    create: async () => ({ ok: true, trigger: { id: "FtNEWCHANNEL" } }),
  });

  await assertRejects(
    () =>
      provisionWorkflowChannelAssociation(
        client,
        "C999",
        "open_onboarding_workflow",
        undefined,
        seedContext,
      ),
    Error,
    "requires dashboard canvas to be provisioned first",
  );
});

Deno.test("Fabricated shortcut URL is rejected when share URL is missing", async () => {
  const { client } = buildClient({
    create: async () => ({
      ok: true,
      trigger: { id: "FtNEWCHANNEL" },
    }),
    add: async () => ({ ok: true }),
  });

  await assertRejects(
    () =>
      provisionWorkflowChannelAssociation(
        client,
        "C999",
        "open_onboarding_workflow",
        dashboardCanvasId,
        seedContext,
      ),
    Error,
    "share URL missing",
  );
});

Deno.test("create grants named_entities with channel when add returns invalid_permission_type", async () => {
  const { client, setPayloads, addPayloads, featuredPayloads } = buildClient({
    create: async () => ({
      ok: true,
      trigger: { id: "FtNEWCHANNEL", share_url: shareUrl },
    }),
    add: async () => ({ ok: false, error: "invalid_permission_type" }),
    set: async () => ({ ok: true }),
  });

  await provisionWorkflowChannelAssociation(
    client,
    "C999",
    "open_onboarding_workflow",
    dashboardCanvasId,
    seedContext,
  );

  assertEquals(addPayloads.length, 1);
  assertEquals(setPayloads, [{
    trigger_id: "FtNEWCHANNEL",
    permission_type: "named_entities",
    channel_ids: ["C999"],
  }]);
  assertEquals(featuredPayloads.length, 0);
});

Deno.test("Seed snapshot includes trigger id and share URL", async () => {
  const { client, updatePayloads } = buildClient({
    create: async () => ({
      ok: true,
      trigger: { id: "FtNEWCHANNEL", share_url: shareUrl },
    }),
    add: async () => ({ ok: true }),
  });

  await provisionWorkflowChannelAssociation(
    client,
    "C999",
    "open_onboarding_workflow",
    dashboardCanvasId,
    seedContext,
  );

  const updatedInputs = updatePayloads[0]?.inputs as Record<string, { value: string }>;
  const snapshot = JSON.parse(
    updatedInputs.dashboard_canvas_content.value,
  ) as TesEventContext;
  assertEquals(snapshot.onboardingTriggerId, "FtNEWCHANNEL");
  assertEquals(snapshot.onboardingLinkUrl, shareUrl);
});

Deno.test("Unknown workflow link fails provision", async () => {
  const { client } = buildClient({ add: async () => ({ ok: true }) });

  await assertRejects(
    () =>
      provisionWorkflowChannelAssociation(
        client,
        "C999",
        "unknown_workflow_link",
        dashboardCanvasId,
        seedContext,
      ),
    Error,
    'Unknown workflow link "unknown_workflow_link"',
  );
});
