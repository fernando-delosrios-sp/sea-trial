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
  assertEquals(
    buildOnboardingCanvasLink("C123", "1234.5678", {
      SLACK_ONBOARDING_TRIGGER_URL: "https://slack.com/shortcuts/onboarding",
    }),
    "https://slack.com/shortcuts/onboarding",
  );
});

Deno.test("buildOnboardingCanvasLink falls back to pinned message link", () => {
  assertEquals(
    buildOnboardingCanvasLink("C123", "1234.5678"),
    "https://app.slack.com/archives/C123/p12345678",
  );
});

Deno.test("resolveOnboardingTriggerUrl returns undefined when unset", () => {
  assertEquals(resolveOnboardingTriggerUrl(), undefined);
});
