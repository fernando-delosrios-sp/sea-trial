import { assertEquals } from "std/assert/mod.ts";
import {
  isKnownWorkflowLink,
  buildWorkflowTriggerEnvVars,
  resolveWorkflowTriggerId,
  resolveWorkflowTriggerShareUrl,
  WORKFLOW_LINK_TRIGGERS,
} from "../lib/workflow-trigger-registry.ts";

const listedTriggers = [
  { id: "FtFROMLIST", title: "Complete Onboarding" },
  { id: "FtOTHER", title: "Create TES Event" },
];

Deno.test("isKnownWorkflowLink recognizes onboarding workflow link", () => {
  assertEquals(isKnownWorkflowLink("open_onboarding_workflow"), true);
  assertEquals(isKnownWorkflowLink("unknown_link"), false);
});

Deno.test("resolveWorkflowTriggerId prefers env over trigger list", () => {
  assertEquals(
    resolveWorkflowTriggerId(
      "open_onboarding_workflow",
      { SLACK_ONBOARDING_TRIGGER_ID: "FtFROMENV" },
      listedTriggers,
    ),
    "FtFROMENV",
  );
});

Deno.test("resolveWorkflowTriggerId falls back to trigger list by title", () => {
  assertEquals(
    resolveWorkflowTriggerId("open_onboarding_workflow", {}, listedTriggers),
    "FtFROMLIST",
  );
});

Deno.test("resolveWorkflowTriggerId returns undefined when link unknown", () => {
  assertEquals(
    resolveWorkflowTriggerId("unknown_link", {}, listedTriggers),
    undefined,
  );
});

Deno.test("resolveWorkflowTriggerId returns undefined when env and list miss", () => {
  assertEquals(
    resolveWorkflowTriggerId("open_onboarding_workflow", {}, [
      { id: "FtOTHER", title: "Other Trigger" },
    ]),
    undefined,
  );
});

Deno.test("buildWorkflowTriggerEnvVars maps onboarding trigger from list", () => {
  const envVars = buildWorkflowTriggerEnvVars([
    { id: "FtONBOARD123", title: "Complete Onboarding" },
    { id: "FtCREATE", title: "Create TES Event" },
  ]);

  assertEquals(envVars.SLACK_ONBOARDING_TRIGGER_ID, "FtONBOARD123");
  assertEquals(envVars.SLACK_ONBOARDING_TRIGGER_URL, undefined);
});

Deno.test("resolveWorkflowTriggerShareUrl prefers SLACK_ONBOARDING_TRIGGER_URL and does not fabricate ID-only URLs", () => {
  assertEquals(
    resolveWorkflowTriggerShareUrl("Ft123", {
      SLACK_ONBOARDING_TRIGGER_URL: "https://slack.com/shortcuts/custom/secret",
    }),
    "https://slack.com/shortcuts/custom/secret",
  );
  assertEquals(
    resolveWorkflowTriggerShareUrl("Ft123"),
    undefined,
  );
});

Deno.test("cleanup matches Complete Onboarding exactly so channel-scoped titles are kept", () => {
  assertEquals(
    WORKFLOW_LINK_TRIGGERS.open_onboarding_workflow.triggerName,
    "Complete Onboarding",
  );
  assertEquals(
    "Complete Onboarding (C123)" ===
      WORKFLOW_LINK_TRIGGERS.open_onboarding_workflow.triggerName,
    false,
  );
});
