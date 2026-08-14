import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildChannelName,
  slugifyProjectName,
  validateChannelName,
} from "../lib/channel.ts";

Deno.test("slugifyProjectName converts to lowercase slug", () => {
  assertEquals(slugifyProjectName("Acme Corp Demo"), "acme-corp-demo");
});

Deno.test("buildChannelName produces proj-{slug}-tes format", () => {
  assertEquals(buildChannelName("Acme Corp"), "proj-acme-corp-tes");
  assertEquals(buildChannelName("Acme Corp", 1), "proj-acme-corp1-tes");
  assertEquals(buildChannelName("Acme Corp", 2), "proj-acme-corp2-tes");
});

Deno.test("validateChannelName accepts valid project name", () => {
  const result = validateChannelName("Acme Corp");
  assertEquals(result.valid, true);
  assertEquals(result.channelName, "proj-acme-corp-tes");
});

Deno.test("validateChannelName rejects empty name", () => {
  const result = validateChannelName("   ");
  assertEquals(result.valid, false);
  assertEquals(result.error, "Project name is required.");
});

Deno.test("validateChannelName rejects reserved slug", () => {
  const result = validateChannelName("general");
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes("reserved"), true);
});
