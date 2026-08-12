import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  matchFieldChangeFunctions,
  parseFieldChangeRule,
} from "../lib/list-field-change.ts";
import {
  resolveFieldChangeDispatch,
  shouldRunValidationRequiredHandler,
} from "../lib/deliverables-list-update.ts";
import { getListFieldChangeRules } from "../lib/content/list-compiler.ts";
import { resetListCacheForTests } from "../lib/content/list-compiler.ts";

Deno.test("parseFieldChangeRule validates deliverables rule shape", () => {
  const rule = parseFieldChangeRule({
    column: "status",
    value: "Validation required",
    function: "on_validation_required",
  });
  assertEquals(rule?.function, "on_validation_required");
});

Deno.test("deliverables.json declares Validation required field_change", () => {
  resetListCacheForTests();
  const rules = getListFieldChangeRules("deliverables");
  assertEquals(
    matchFieldChangeFunctions(rules, "status", "Validation required"),
    ["on_validation_required"],
  );
});

Deno.test("shouldRunValidationRequiredHandler when status changes", () => {
  assertEquals(
    shouldRunValidationRequiredHandler({
      listName: "deliverables",
      column: "status",
      previousValue: "In progress",
      newValue: "Validation required",
      row: {
        taskId: "TES-001",
        status: "Validation required",
        situation: "Testing",
        category: "SSO",
        requirements: "Configure SSO",
      },
    }),
    true,
  );
});

Deno.test("resolveFieldChangeDispatch ignores unchanged value", () => {
  assertEquals(
    resolveFieldChangeDispatch({
      listName: "deliverables",
      column: "status",
      previousValue: "Validation required",
      newValue: "Validation required",
      row: {
        taskId: "TES-001",
        status: "Validation required",
        situation: "Testing",
        category: "SSO",
        requirements: "Req",
      },
    }).length,
    0,
  );
});
