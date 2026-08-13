import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import { serializeEventContext } from "../lib/event-context.ts";
import {
  buildOnboardingModalView,
  resolveAccountPrefill,
} from "../lib/onboarding-modal.ts";
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
  situationReportCanvasId: "sr1",
  accountName: "Acme Corp",
};

Deno.test("Open onboarding form — modal has all required fields", () => {
  assertEquals(ONBOARDING_MODAL_BLOCKS.length, 9);
  assertEquals(ONBOARDING_MODAL_BLOCKS.includes("account_name"), true);
  assertEquals(ONBOARDING_MODAL_BLOCKS.includes("sailpoint_suite"), true);
});

Deno.test("Open onboarding form — Account is pre-filled from TesEventContext.accountName", () => {
  const dashboardContent = serializeEventContext(baseContext);
  const view = buildOnboardingModalView({
    channelId: "C1",
    dashboardCanvasContent: dashboardContent,
    accountName: resolveAccountPrefill(dashboardContent),
  }) as {
    blocks: Array<{
      block_id: string;
      element: { initial_value?: string };
      label: { text: string };
    }>;
  };

  const accountBlock = view.blocks.find((block) => block.block_id === "account_name");
  assertEquals(accountBlock?.label.text, "Account");
  assertEquals(accountBlock?.element.initial_value, "Acme Corp");
});

Deno.test("Submit onboarding updates context and dashboard", () => {
  const serialized = serializeEventContext(baseContext);
  const existing = JSON.parse(
    serialized.match(/```json\s*([\s\S]*?)\s*```/)![1],
  ) as TesEventContext;

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
  assertEquals(result.context.accountName, "Acme Corp");
  assertEquals(result.context.derivedComponents.includes("IdentityNow"), true);
  assertEquals(result.dashboardContent.includes("Acme Corp"), true);
  assertEquals(result.dashboardContent.includes("<!-- tes-event-context -->"), true);
});

Deno.test("Submit onboarding overwrites context accountName when Account is edited", () => {
  const result = processOnboardingSubmit(baseContext, {
    accountName: "Renamed Account",
    mainProspectGoal: "PoC",
    dealHistory: "New",
    projectType: "PoC",
    stakeholders: "SE",
    competitors: "None",
    sailpointSuite: "Identity Security Cloud",
    deadline: "2026-09-01",
    notes: "",
  });

  assertEquals(result.context.accountName, "Renamed Account");
  assertEquals(result.dashboardContent.includes("Renamed Account"), true);
});

Deno.test("Submit onboarding does not invoke the Requirements Agent", () => {
  const onboardingSubmitSource = Deno.readTextFileSync(
    new URL("../lib/onboarding-view-submit.ts", import.meta.url),
  );
  assertEquals(onboardingSubmitSource.includes("callRequirementsAgent"), false);
  assertEquals(onboardingSubmitSource.includes("runInvokeAgentHandler"), false);
});
