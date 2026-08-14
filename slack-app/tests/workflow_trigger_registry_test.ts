import { assertEquals } from "std/assert/mod.ts";
import {
  isKnownWorkflowLink,
  resolveWorkflowTriggerId,
  resolveWorkflowTriggerShareUrl,
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

Deno.test("resolveWorkflowTriggerShareUrl prefers SLACK_ONBOARDING_TRIGGER_URL", () => {
  assertEquals(
    resolveWorkflowTriggerShareUrl("Ft123", {
      SLACK_ONBOARDING_TRIGGER_URL: "https://slack.com/shortcuts/custom",
    }),
    "https://slack.com/shortcuts/custom",
  );
  assertEquals(
    resolveWorkflowTriggerShareUrl("Ft123"),
    "https://slack.com/shortcuts/Ft123",
  );
});
