import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { onboardingGateMessage } from "../lib/agent-client.ts";
import { shouldProceedWithAgent } from "../lib/agent-gate.ts";

const incompleteContext = {
  channelId: "C1",
  projectName: "X",
  onboardingComplete: false,
  derivedComponents: [] as string[],
  dashboardCanvasId: "d",
  requirementsCanvasId: "r",
  deliverablesListId: "l1",
  incidentsListId: "l2",
  infrastructureCanvasId: "i",
};

const completeContext = { ...incompleteContext, onboardingComplete: true };

Deno.test("onboardingGateMessage directs user to complete onboarding", () => {
  const message = onboardingGateMessage();
  assertEquals(message.includes("Onboarding is not complete"), true);
  assertEquals(message.includes("/tes-onboard"), true);
});

Deno.test("agent gate blocks when onboardingComplete is false", () => {
  assertEquals(shouldProceedWithAgent(null), false);
  assertEquals(shouldProceedWithAgent(incompleteContext), false);
});

Deno.test("agent gate allows when onboardingComplete is true", () => {
  assertEquals(shouldProceedWithAgent(completeContext), true);
});
