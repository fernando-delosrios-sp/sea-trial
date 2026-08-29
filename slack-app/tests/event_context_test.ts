import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyOnboarding,
  deserializeEventContext,
  serializeEventContext,
} from "../lib/event-context.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";

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
  situationReportCanvasId: "sr1",
};

Deno.test("serializeEventContext round-trips via deserializeEventContext", () => {
  const serialized = serializeEventContext(baseContext);
  const deserialized = deserializeEventContext(serialized);
  assertEquals(deserialized, baseContext);
});

Deno.test("deserializeEventContext compact JSON round-trip", () => {
  const compact = JSON.stringify(baseContext);
  assertEquals(deserializeEventContext(compact), baseContext);
});

Deno.test("existing Dashboard metadata markdown still deserializes", () => {
  const markdown = [
    "# TES Event Dashboard",
    "",
    "## Project",
    "",
    serializeEventContext(baseContext),
  ].join("\n");
  assertEquals(deserializeEventContext(markdown), baseContext);
});

Deno.test("deserializeEventContext invalid JSON fails", () => {
  assertEquals(deserializeEventContext("{not-json"), null);
  assertEquals(deserializeEventContext("{"), null);
  assertEquals(deserializeEventContext(""), null);
});

Deno.test("serializeEventContext round-trips creation-modal fields", () => {
  const contextWithCreationFields: TesEventContext = {
    ...baseContext,
    accountName: "Acme Corp",
    salesforceOpportunityUrl: "https://acme.my.salesforce.com/0061",
    memberUserIds: ["U123", "U456"],
    contextNotes: "Kickoff scheduled for next week",
  };

  const serialized = serializeEventContext(contextWithCreationFields);
  const deserialized = deserializeEventContext(serialized);

  assertEquals(deserialized, contextWithCreationFields);
});

Deno.test("applyOnboarding sets onboardingComplete and derived components", () => {
  const form = {
    accountName: "Acme",
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

