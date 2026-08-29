import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { serializeEventContextSnapshot } from "../lib/event-context.ts";
import {
  INVALID_REPAIR_SNAPSHOT_ERROR,
  MISSING_REPAIR_SNAPSHOT_ERROR,
  resolveRepairEventContext,
} from "../lib/repair-onboarding-trigger.ts";

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
    new URL("../scripts/repair-workflow-tab.ts", import.meta.url),
  );
  assertEquals(source.includes("readCanvasMarkdown"), false);
});
