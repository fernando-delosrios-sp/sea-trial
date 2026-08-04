import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyOnboarding,
  deserializeEventContext,
  serializeEventContext,
} from "../lib/event-context.ts";
import type { TesEventContext } from "@tes/shared/types/index.ts";

const baseContext: TesEventContext = {
  channelId: "C123",
  projectName: "Acme",
  onboardingComplete: false,
  derivedComponents: [],
  dashboardCanvasId: "dash1",
  requirementsCanvasId: "req1",
  deliverablesListId: "list1",
  incidentsListId: "list2",
  infrastructureCanvasId: "infra1",
};

Deno.test("serializeEventContext round-trips via deserializeEventContext", () => {
  const serialized = serializeEventContext(baseContext);
  const deserialized = deserializeEventContext(serialized);
  assertEquals(deserialized, baseContext);
});

Deno.test("applyOnboarding sets onboardingComplete and derived components", () => {
  const form = {
    customerName: "Acme",
    mainProspectGoal: "PoC",
    dealHistory: "New",
    projectType: "PoC",
    stakeholders: "SE, AE",
    competitors: "None",
    sailpointSuite: "Identity Security Cloud",
    deadline: "2026-09-01",
    notes: "",
  };

  const updated = applyOnboarding(baseContext, form, ["IdentityNow"]);
  assertEquals(updated.onboardingComplete, true);
  assertEquals(updated.onboarding, form);
  assertEquals(updated.derivedComponents, ["IdentityNow"]);
});
