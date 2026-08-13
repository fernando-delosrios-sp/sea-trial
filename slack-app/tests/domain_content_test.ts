import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { DeliverableStatus } from "@sea-trial/shared/types/index.ts";
import {
  deriveComponents,
  getCustomerDeliverableStatusMap,
  getDeliverableStatusChoices,
  getSupportedSuites,
  mapToCustomerStatus,
  parseCustomerDeliverableStatusesJson,
  parseDeliverableStatusesJson,
  parseSailpointSuitesJson,
} from "../lib/content/domain.ts";
import { buildOnboardingModalView } from "../lib/onboarding-modal.ts";

const DELIVERABLE_STATUS_VALUES: DeliverableStatus[] = [
  "Not started",
  "Not needed",
  "Not doable",
  "In progress",
  "Blocked",
  "Validation required",
  "Accepted",
  "Needs clarification",
];

Deno.test("sailpoint-suites.json loads with expected suite keys", () => {
  const suites = getSupportedSuites();
  assertEquals(suites.includes("Identity Security Cloud"), true);
  assertEquals(suites.includes("IdentityIQ"), true);
  assertEquals(suites.includes("IdentityNow"), true);
});

Deno.test("deliverable-statuses.json loads with value === label", () => {
  for (const choice of getDeliverableStatusChoices()) {
    assertEquals(choice.value, choice.label);
  }
});

Deno.test("valid domain files pass validation via accessors", () => {
  assertEquals(getSupportedSuites().length > 0, true);
  assertEquals(getDeliverableStatusChoices().length > 0, true);
});

Deno.test("invalid sailpoint suites file throws validation error", () => {
  assertThrows(
    () => parseSailpointSuitesJson(JSON.stringify({ suites: {} })),
    Error,
    "at least one suite",
  );
});

Deno.test("invalid deliverable statuses file throws validation error", () => {
  assertThrows(
    () =>
      parseDeliverableStatusesJson(
        JSON.stringify({ choices: [{ value: "A", label: "B" }] }),
      ),
    Error,
    "value must equal label",
  );
});

Deno.test("DeliverableStatus bidirectional sync with shared type", () => {
  const jsonValues = getDeliverableStatusChoices().map((c) => c.value);
  for (const status of DELIVERABLE_STATUS_VALUES) {
    assertEquals(jsonValues.includes(status), true);
  }
  assertEquals(jsonValues.length, DELIVERABLE_STATUS_VALUES.length);
});

Deno.test("deriveComponents returns JSON-defined components per suite", () => {
  const suites = parseSailpointSuitesJson(
    Deno.readTextFileSync("content/domain/sailpoint-suites.json"),
  );
  for (const [suite, expected] of Object.entries(suites)) {
    assertEquals(deriveComponents(suite), expected);
  }
});

Deno.test("onboarding modal suite options match domain JSON keys", () => {
  const view = buildOnboardingModalView({
    channelId: "C123",
    dashboardCanvasContent: "",
  });
  const blocks = view.blocks as Array<Record<string, unknown>>;
  const suiteBlock = blocks.find((b) => b.block_id === "sailpoint_suite");
  const element = suiteBlock?.element as {
    options?: Array<{ value: string }>;
  };
  const optionValues = (element?.options ?? []).map((o) => o.value).sort();
  assertEquals(optionValues, [...getSupportedSuites()].sort());
});

Deno.test("status choices include Not started and Needs clarification", () => {
  const values = getDeliverableStatusChoices().map((c) => c.value);
  assertEquals(values.includes("Not started"), true);
  assertEquals(values.includes("Needs clarification"), true);
});

Deno.test("accepted proposal default status is valid domain JSON value", () => {
  const values = getDeliverableStatusChoices().map((c) => c.value);
  assertEquals(values.includes("Not started"), true);
});

Deno.test("customer-deliverable-statuses maps all DeliverableStatus values", () => {
  const mappings = getCustomerDeliverableStatusMap();
  assertEquals(mappings.length, DELIVERABLE_STATUS_VALUES.length);
  for (const status of DELIVERABLE_STATUS_VALUES) {
    const mapped = mapToCustomerStatus(status);
    assertEquals(typeof mapped.bucket, "string");
    assertEquals(typeof mapped.label, "string");
  }
});

Deno.test("Blocked internal status maps to Needs your input bucket", () => {
  const mapped = mapToCustomerStatus("Blocked");
  assertEquals(mapped.label, "Needs your input");
  assertEquals(mapped.bucket, "needs_input");
});

Deno.test("invalid customer status map throws validation error", () => {
  assertThrows(
    () =>
      parseCustomerDeliverableStatusesJson(
        JSON.stringify({ mappings: [{ internal: "Blocked", bucket: "bad", label: "X" }] }),
      ),
    Error,
    "known customer bucket",
  );
});
