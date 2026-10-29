import assert from "node:assert/strict";
import test from "node:test";

test("shared package exports types and agents", async () => {
  const mod = await import("../dist/index.js");
  assert.equal(typeof mod, "object");
  const agents = await import("../dist/agents.js");
  assert.equal(typeof agents, "object");
});
