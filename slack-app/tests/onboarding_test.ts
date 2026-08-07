import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@tes/shared/types/index.ts";
import { deserializeEventContext, serializeEventContext } from "../lib/event-context.ts";
import {
  ONBOARDING_MODAL_BLOCKS,
  processOnboardingSubmit,
} from "../lib/onboarding-submit.ts";

const baseContext: TesEventContext = {
  channelId: "C1",
  projectName: "Acme",
  onboardingComplete: false,
  derivedComponents: [],
  dashboardCanvasId: "dash-1",
  requirementsCanvasId: "req-1",
  deliverablesListId: "list-1",
  incidentsListId: "list-2",
  infrastructureCanvasId: "infra-1",
};

Deno.test("Open onboarding form — modal has all required fields", () => {
  assertEquals(ONBOARDING_MODAL_BLOCKS.length, 9);
  assertEquals(ONBOARDING_MODAL_BLOCKS.includes("sailpoint_suite"), true);
});

Deno.test("Submit onboarding updates context and dashboard", () => {
  const serialized = serializeEventContext(baseContext);
  const existing = deserializeEventContext(serialized)!;

  const result = processOnboardingSubmit(existing, {
    accountName: "Acme Corp",
    mainProspectGoal: "PoC",
    dealHistory: "New",
    projectType: "PoC",
    stakeholders: "SE",
    competitors: "None",
    sailpointSuite: "Identity Security Cloud",
    deadline: "2026-09-01",
    notes: "",
  });

  assertEquals(result.context.onboardingComplete, true);
  assertEquals(result.context.derivedComponents.includes("IdentityNow"), true);
  assertEquals(result.dashboardContent.includes("Acme Corp"), true);
  assertEquals(result.dashboardContent.includes("<!-- tes-event-context -->"), true);
});

