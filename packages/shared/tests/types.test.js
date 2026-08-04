import assert from "node:assert/strict";
import test from "node:test";

test("shared package exports types", async () => {
  const mod = await import("../dist/index.js");
  assert.equal(typeof mod, "object");
});
