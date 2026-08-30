import { assertEquals, assertRejects, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { serializeEventContextSnapshot } from "../lib/event-context.ts";
import {
  INVALID_REPAIR_SNAPSHOT_ERROR,
  MISSING_REPAIR_SNAPSHOT_ERROR,
  resolveRepairEventContext,
} from "../lib/repair-onboarding-trigger.ts";
import { repairTesEventChannel } from "../lib/repair-tes-event-context.ts";
import { TES_EVENT_CONTEXT_DATASTORE_NAME } from "../datastores/tes_event_context.ts";

const seedContext: TesEventContext = {
  channelId: "C1",
  projectName: "Acme",
  onboardingComplete: false,
  derivedComponents: [],
  dashboardCanvasId: "dash-1",
  requirementsCanvasId: "req-1",
  deliverablesListId: "list-1",
  incidentsListId: "list-2",
  infrastructureCanvasId: "infra-1",
  situationReportCanvasId: "sr1",
  accountName: "Acme Corp",
};

Deno.test("repair requires TES_EVENT_CONTEXT_JSON", () => {
  assertThrows(
    () => resolveRepairEventContext({}),
    Error,
    MISSING_REPAIR_SNAPSHOT_ERROR,
  );
  assertThrows(
    () => resolveRepairEventContext({ TES_EVENT_CONTEXT_JSON: "   " }),
    Error,
    MISSING_REPAIR_SNAPSHOT_ERROR,
  );
});

Deno.test("repair rejects invalid TES_EVENT_CONTEXT_JSON", () => {
  assertThrows(
    () => resolveRepairEventContext({ TES_EVENT_CONTEXT_JSON: "{not-json" }),
    Error,
    INVALID_REPAIR_SNAPSHOT_ERROR,
  );
});

Deno.test("repair accepts compact TesEventContext snapshot", () => {
  const context = resolveRepairEventContext({
    TES_EVENT_CONTEXT_JSON: serializeEventContextSnapshot(seedContext),
  });
  assertEquals(context, seedContext);
});

Deno.test("repair script does not read canvas markdown", () => {
  const source = Deno.readTextFileSync(
    new URL("../scripts/repair-tes-event-context.ts", import.meta.url),
  );
  assertEquals(source.includes("readCanvasMarkdown"), false);
  assertEquals(source.includes("triggers.create"), false);
  assertEquals(source.includes("workflow tab"), false);
});

Deno.test("repair puts a store row and grants the global shortcut", async () => {
  const puts: Array<{ datastore: string; item: { channel_id: string } }> = [];
  const grants: Array<{ trigger_id: string; channel_ids?: string[] }> = [];

  await repairTesEventChannel(
    {
      apps: {
        datastore: {
          get: async () => ({ ok: true }),
          put: async (params) => {
            puts.push(params);
            return { ok: true };
          },
        },
      },
      workflows: {
        triggers: {
          permissions: {
            add: async (payload) => {
              grants.push(payload);
              return { ok: true };
            },
          },
        },
      },
    },
    seedContext,
    { SLACK_ONBOARDING_TRIGGER_ID: "FtGLOBAL" },
  );

  assertEquals(puts[0]?.datastore, TES_EVENT_CONTEXT_DATASTORE_NAME);
  assertEquals(puts[0]?.item.channel_id, "C1");
  assertEquals(grants, [{ trigger_id: "FtGLOBAL", channel_ids: ["C1"] }]);
});

Deno.test("repair fails clearly when put fails", async () => {
  await assertRejects(
    () =>
      repairTesEventChannel(
        {
          apps: {
            datastore: {
              get: async () => ({ ok: true }),
              put: async () => ({ ok: false, error: "restricted_action" }),
            },
          },
          workflows: {
            triggers: {
              permissions: {
                add: async () => ({ ok: true }),
              },
            },
          },
        },
        seedContext,
        { SLACK_ONBOARDING_TRIGGER_ID: "FtGLOBAL" },
      ),
    Error,
    "restricted_action",
  );
});
