import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  allocateUniqueName,
  formatSuffixedName,
  isNameCollisionError,
  MAX_NAME_COLLISION_ATTEMPTS,
  NameCollisionError,
} from "../lib/unique-resource-name.ts";

Deno.test("formatSuffixedName returns base name for attempt zero", () => {
  assertEquals(formatSuffixedName("Dashboard", 0), "Dashboard");
});

Deno.test("formatSuffixedName appends numeric suffix from one", () => {
  assertEquals(formatSuffixedName("Dashboard", 1), "Dashboard1");
  assertEquals(formatSuffixedName("Dashboard", 2), "Dashboard2");
});

Deno.test("isNameCollisionError detects known Slack collision codes", () => {
  assertEquals(isNameCollisionError("name_taken"), true);
  assertEquals(isNameCollisionError("already_exists"), true);
  assertEquals(isNameCollisionError("missing_scope"), false);
  assertEquals(isNameCollisionError(undefined), false);
});

Deno.test("allocateUniqueName succeeds on first attempt", async () => {
  const attempts: string[] = [];
  const { name, result } = await allocateUniqueName("Dashboard", async (candidate) => {
    attempts.push(candidate);
    return "canvas-1";
  });

  assertEquals(name, "Dashboard");
  assertEquals(result, "canvas-1");
  assertEquals(attempts, ["Dashboard"]);
});

Deno.test("allocateUniqueName retries with suffix after collision", async () => {
  const attempts: string[] = [];
  const { name, result } = await allocateUniqueName("Dashboard", async (candidate) => {
    attempts.push(candidate);
    if (candidate === "Dashboard") {
      throw new NameCollisionError("name_taken");
    }
    return "canvas-2";
  });

  assertEquals(name, "Dashboard1");
  assertEquals(result, "canvas-2");
  assertEquals(attempts, ["Dashboard", "Dashboard1"]);
});

Deno.test("allocateUniqueName throws when retry cap exhausted", async () => {
  await assertRejects(
    () =>
      allocateUniqueName(
        "Dashboard",
        async () => {
          throw new NameCollisionError("name_taken");
        },
        { maxAttempts: 3 },
      ),
    Error,
    'Failed to allocate unique name for "Dashboard" after 3 attempts',
  );
});

Deno.test("allocateUniqueName rethrows non-collision errors immediately", async () => {
  await assertRejects(
    () =>
      allocateUniqueName("Dashboard", async () => {
        throw new Error("missing_scope");
      }),
    Error,
    "missing_scope",
  );
});

Deno.test("MAX_NAME_COLLISION_ATTEMPTS defaults to 100", () => {
  assertEquals(MAX_NAME_COLLISION_ATTEMPTS, 100);
});
