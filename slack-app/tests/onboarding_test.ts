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
import { parseOnboardingForm } from "../lib/onboarding-view-submit.ts";

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

function onboardingElement(
  view: { blocks: Array<{ block_id: string; element: Record<string, unknown> }> },
  blockId: string,
): Record<string, unknown> {
  const block = view.blocks.find((candidate) => candidate.block_id === blockId);
  return block?.element ?? {};
}

Deno.test("Onboarding modal uses rich text inputs, selects, and a date picker", () => {
  const dashboardContent = JSON.stringify(baseContext);
  const view = buildOnboardingModalView({
    channelId: "C1",
    dashboardCanvasContent: dashboardContent,
    accountName: resolveAccountPrefill(dashboardContent),
  }) as {
    blocks: Array<{ block_id: string; element: Record<string, unknown> }>;
  };

  assertEquals(onboardingElement(view, "main_prospect_goal").type, "rich_text_input");
  assertEquals(onboardingElement(view, "deal_history").type, "rich_text_input");
  assertEquals(onboardingElement(view, "stakeholders").type, "rich_text_input");

  const projectType = onboardingElement(view, "project_type");
  assertEquals(projectType.type, "static_select");
  assertEquals(
    (projectType.options as Array<{ value: string }>).map((option) => option.value),
    [
      "SailPoint-hosted POC",
      "On prem POC",
      "Pilot",
      "Custom demo",
      "Workshop",
    ],
  );

  const competitors = onboardingElement(view, "competitors");
  assertEquals(competitors.type, "multi_static_select");
  assertEquals(
    (competitors.options as Array<{ value: string }>).map((option) => option.value),
    [
      "Saviynt",
      "Okta",
      "Microsoft Entra",
      "One Identity",
      "Omada",
      "Oracle",
      "IBM",
      "Ping Identity",
      "Veza",
      "Bravura Security",
      "Other",
    ],
  );

  assertEquals(onboardingElement(view, "deadline").type, "datepicker");
});

Deno.test("Submit onboarding reads select, multi-select, and date values from Slack state", () => {
  const form = parseOnboardingForm({
    account_name: { value: { type: "plain_text_input", value: "ACME" } },
    main_prospect_goal: {
      value: {
        type: "rich_text_input",
        rich_text_value: {
          type: "rich_text",
          elements: [
            {
              type: "rich_text_section",
              elements: [{ type: "text", text: "Prove identity governance" }],
            },
          ],
        },
      },
    },
    deal_history: { value: { type: "plain_text_input", value: "Renewal cycle" } },
    project_type: {
      value: {
        type: "static_select",
        selected_option: { value: "Pilot" },
      },
    },
    stakeholders: {
      value: {
        type: "rich_text_input",
        rich_text_value: {
          type: "rich_text",
          elements: [
            {
              type: "rich_text_list",
              style: "bullet",
              elements: [
                {
                  type: "rich_text_section",
                  elements: [{ type: "text", text: "Dana Vance (CISO)" }],
                },
                {
                  type: "rich_text_section",
                  elements: [{ type: "text", text: "Ravi Patel (IAM lead)" }],
                },
              ],
            },
          ],
        },
      },
    },
    competitors: {
      value: {
        type: "multi_static_select",
        selected_options: [{ value: "Okta" }, { value: "Saviynt" }],
      },
    },
    sailpoint_suite: {
      value: {
        type: "static_select",
        selected_option: { value: "Identity Security Cloud" },
      },
    },
    deadline: { value: { type: "datepicker", selected_date: "2026-09-01" } },
    notes: { value: { type: "plain_text_input", value: "" } },
  });

  assertEquals(form.accountName, "ACME");
  assertEquals(form.projectType, "Pilot");
  assertEquals(form.competitors, "Okta, Saviynt");
  assertEquals(form.deadline, "2026-09-01");
  assertEquals(form.stakeholders, "Dana Vance (CISO)\nRavi Patel (IAM lead)");
  assertEquals(form.mainProspectGoal, "Prove identity governance");
});

Deno.test("Open onboarding form from pinned index — Account is pre-filled from TesEventContext.accountName", () => {
  const dashboardContent = JSON.stringify(baseContext);
  const view = buildOnboardingModalView({
    channelId: "C1",
    dashboardCanvasContent: dashboardContent,
    accountName: resolveAccountPrefill(dashboardContent),
  }) as {
    private_metadata: string;
    blocks: Array<{
      block_id: string;
      element: { initial_value?: string };
      label: { text: string };
    }>;
  };

  const accountBlock = view.blocks.find((block) => block.block_id === "account_name");
  assertEquals(accountBlock?.label.text, "Account");
  assertEquals(accountBlock?.element.initial_value, "Acme Corp");

  const metadata = JSON.parse(view.private_metadata) as {
    channel_id: string;
    dashboard_canvas_id: string;
    dashboard_canvas_content?: string;
  };
  assertEquals(metadata.channel_id, "C1");
  assertEquals(metadata.dashboard_canvas_id, "dash-1");
  assertStringIncludes(metadata.dashboard_canvas_content ?? "", "dash-1");
  assertStringIncludes(metadata.dashboard_canvas_content ?? "", "Acme Corp");
  assertEquals(view.private_metadata.length <= 3000, true);
});

Deno.test("incomplete snapshot prefills Account only", () => {
  const dashboardContent = JSON.stringify(baseContext);
  const view = buildOnboardingModalView({
    channelId: "C1",
    dashboardCanvasContent: dashboardContent,
    accountName: resolveAccountPrefill(dashboardContent),
  }) as {
    blocks: Array<{ block_id: string; element: Record<string, unknown> }>;
  };

  assertEquals(onboardingElement(view, "account_name").initial_value, "Acme Corp");
  assertEquals(onboardingElement(view, "sailpoint_suite").initial_option, undefined);
  assertEquals(onboardingElement(view, "stakeholders").initial_value, undefined);
  assertEquals(onboardingElement(view, "project_type").initial_option, undefined);
  assertEquals(onboardingElement(view, "deadline").initial_date, undefined);
});

Deno.test("Open after complete prefills submitted fields", () => {
  const dashboardContent = JSON.stringify({
    ...baseContext,
    onboardingComplete: true,
    onboarding: {
      accountName: "Edited Account",
      mainProspectGoal: "Prove identity governance",
      dealHistory: "Renewal cycle",
      projectType: "Pilot",
      stakeholders: "Dana Vance (CISO)\nRavi Patel (IAM lead)",
      competitors: "Okta, Saviynt",
      sailpointSuite: "Identity Security Cloud",
      deadline: "2026-09-01",
      notes: "Bring architecture diagram",
    },
  });
  const view = buildOnboardingModalView({
    channelId: "C1",
    dashboardCanvasContent: dashboardContent,
    accountName: resolveAccountPrefill(dashboardContent),
  }) as {
    blocks: Array<{ block_id: string; element: Record<string, unknown> }>;
  };

  assertEquals(onboardingElement(view, "account_name").initial_value, "Edited Account");
  assertEquals(
    (onboardingElement(view, "sailpoint_suite").initial_option as { value?: string })
      ?.value,
    "Identity Security Cloud",
  );
  assertEquals(
    (onboardingElement(view, "project_type").initial_option as { value?: string })
      ?.value,
    "Pilot",
  );
  assertEquals(
    (
      onboardingElement(view, "competitors").initial_options as Array<{ value: string }>
    ).map((option) => option.value),
    ["Okta", "Saviynt"],
  );
  assertEquals(onboardingElement(view, "deadline").initial_date, "2026-09-01");
  assertEquals(onboardingElement(view, "notes").initial_value, "Bring architecture diagram");
  assertEquals(
    onboardingElement(view, "stakeholders").initial_value,
    {
      type: "rich_text",
      elements: [
        {
          type: "rich_text_list",
          style: "bullet",
          elements: [
            {
              type: "rich_text_section",
              elements: [{ type: "text", text: "Dana Vance (CISO)" }],
            },
            {
              type: "rich_text_section",
              elements: [{ type: "text", text: "Ravi Patel (IAM lead)" }],
            },
          ],
        },
      ],
    },
  );
});

Deno.test("Trigger context snapshot term in glossary", () => {
  const living = Deno.readTextFileSync(
    new URL("../../openspec/specs/ubiquitous-language/spec.md", import.meta.url),
  );
  assertEquals(living.includes("### Term: Trigger context snapshot"), true);
  assertStringIncludes(living, "rewritten on every successful onboarding submit");
  assertStringIncludes(living, "Not Dashboard markdown");
});

Deno.test("open still does not call readCanvasMarkdown", () => {
  const openSource = Deno.readTextFileSync(
    new URL("../functions/open_onboarding/mod.ts", import.meta.url),
  );
  const compilerSource = Deno.readTextFileSync(
    new URL("../lib/content/modal-compiler.ts", import.meta.url),
  );
  assertEquals(openSource.includes("readCanvasMarkdown"), false);
  assertEquals(compilerSource.includes("readCanvasMarkdown"), false);
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
  assertStringIncludes(
    result.dashboardContent,
    "- [x] Run **Complete onboarding** — fill in opportunity details",
  );
  assertEquals(result.dashboardContent.includes("<!-- tes-event-context -->"), false);
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
