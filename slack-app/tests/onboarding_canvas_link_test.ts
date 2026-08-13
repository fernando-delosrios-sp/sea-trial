import { assertEquals } from "std/assert/assert_equals.ts";
import {
  buildOnboardingCanvasLink,
  buildPinnedMessageLink,
  resolveOnboardingTriggerUrl,
} from "../lib/onboarding-canvas-link.ts";

Deno.test("buildPinnedMessageLink formats Slack archive URLs", () => {
  assertEquals(
    buildPinnedMessageLink("C123", "1234.5678"),
    "https://app.slack.com/archives/C123/p12345678",
  );
});

Deno.test("buildOnboardingCanvasLink prefers trigger URL over pinned message", () => {
  Deno.env.set("SLACK_ONBOARDING_TRIGGER_URL", "https://slack.com/shortcuts/onboarding");
  try {
    assertEquals(
      buildOnboardingCanvasLink("C123", "1234.5678"),
      "https://slack.com/shortcuts/onboarding",
    );
  } finally {
    Deno.env.delete("SLACK_ONBOARDING_TRIGGER_URL");
  }
});

Deno.test("buildOnboardingCanvasLink falls back to pinned message link", () => {
  Deno.env.delete("SLACK_ONBOARDING_TRIGGER_URL");
  assertEquals(
    buildOnboardingCanvasLink("C123", "1234.5678"),
    "https://app.slack.com/archives/C123/p12345678",
  );
});

Deno.test("resolveOnboardingTriggerUrl returns undefined when unset", () => {
  Deno.env.delete("SLACK_ONBOARDING_TRIGGER_URL");
  assertEquals(resolveOnboardingTriggerUrl(), undefined);
});
