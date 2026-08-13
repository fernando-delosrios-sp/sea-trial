import { assertEquals } from "std/assert/assert_equals.ts";
import { getSlackListSchema } from "../lib/content/list-compiler.ts";
import {
  finalizeSlackListSchema,
  fromSlackListSelectValue,
  toSlackListSelectValue,
} from "../lib/content/slack-list-schema.ts";

Deno.test("toSlackListSelectValue slugifies human labels", () => {
  assertEquals(toSlackListSelectValue("Not started"), "not_started");
  assertEquals(toSlackListSelectValue("Validation required"), "validation_required");
});

Deno.test("fromSlackListSelectValue maps slug back to domain label", () => {
  const labels = ["Not started", "Validation required"] as const;
  assertEquals(fromSlackListSelectValue("not_started", labels), "Not started");
  assertEquals(fromSlackListSelectValue("Validation required", labels), "Validation required");
});

Deno.test("deliverables Slack schema adds select colors and slug values", () => {
  const schema = getSlackListSchema("deliverables");
  const status = schema.find((column) => column.key === "status");
  const assignee = schema.find((column) => column.key === "assignee");

  assertEquals(assignee?.type, "assignee");
  assertEquals(status?.options?.format, "single_select");
  assertEquals(
    status?.options?.choices?.every((choice) => typeof choice.color === "string"),
    true,
  );
  assertEquals(status?.options?.choices?.[0]?.value, "not_started");
  assertEquals(status?.options?.choices?.[0]?.label, "Not started");
});

Deno.test("finalizeSlackListSchema preserves non-select columns", () => {
  const finalized = finalizeSlackListSchema([
    { key: "task_id", name: "Task ID", type: "text", is_primary_column: true },
  ]);
  assertEquals(finalized.length, 1);
  assertEquals(finalized[0].type, "text");
});
