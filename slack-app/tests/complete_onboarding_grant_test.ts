import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCompleteOnboardingTriggerEnvVars,
  COMPLETE_ONBOARDING_TRIGGER_NAME,
  isRetiredOnboardingTriggerTitle,
  resolveCompleteOnboardingTriggerId,
} from "../lib/complete-onboarding-grant.ts";

Deno.test("retired titles match Complete Onboarding and per-channel names", () => {
  assertEquals(isRetiredOnboardingTriggerTitle("Complete Onboarding"), true);
  assertEquals(isRetiredOnboardingTriggerTitle("Complete Onboarding (C123)"), true);
  assertEquals(isRetiredOnboardingTriggerTitle("Complete onboarding"), false);
  assertEquals(isRetiredOnboardingTriggerTitle("Create TES Event"), false);
});

Deno.test("resolveCompleteOnboardingTriggerId prefers env then list title", () => {
  assertEquals(
    resolveCompleteOnboardingTriggerId(
      { SLACK_ONBOARDING_TRIGGER_ID: "FtFROMENV" },
      [{ id: "FtLIST", title: COMPLETE_ONBOARDING_TRIGGER_NAME }],
    ),
    "FtFROMENV",
  );
  assertEquals(
    resolveCompleteOnboardingTriggerId({}, [
      { id: "FtLIST", title: COMPLETE_ONBOARDING_TRIGGER_NAME },
      { id: "FtCREATE", title: "Create TES Event" },
    ]),
    "FtLIST",
  );
});

Deno.test("buildCompleteOnboardingTriggerEnvVars maps live shortcut from list", () => {
  const envVars = buildCompleteOnboardingTriggerEnvVars([
    { id: "FtONBOARD123", title: COMPLETE_ONBOARDING_TRIGGER_NAME },
    { id: "FtCREATE", title: "Create TES Event" },
  ]);
  assertEquals(envVars.SLACK_ONBOARDING_TRIGGER_ID, "FtONBOARD123");
});
