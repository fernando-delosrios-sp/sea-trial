import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveAgentServiceUrl } from "../lib/agent-client.ts";
import { buildOutgoingDomains } from "../lib/outgoing-domains.ts";

Deno.test("resolveAgentServiceUrl throws when AGENT_SERVICE_URL is missing", () => {
  assertThrows(
    () => resolveAgentServiceUrl({}),
    Error,
    "AGENT_SERVICE_URL is required",
  );
});

Deno.test("resolveAgentServiceUrl throws when AGENT_SERVICE_URL is blank", () => {
  assertThrows(
    () => resolveAgentServiceUrl({ AGENT_SERVICE_URL: "   " }),
    Error,
    "AGENT_SERVICE_URL is required",
  );
});

Deno.test("resolveAgentServiceUrl returns trimmed URL", () => {
  assertEquals(
    resolveAgentServiceUrl({
      AGENT_SERVICE_URL: " https://example.onrender.com ",
    }),
    "https://example.onrender.com",
  );
});

Deno.test("buildOutgoingDomains always includes localhost", () => {
  assertEquals(buildOutgoingDomains(undefined), ["localhost"]);
});

Deno.test("buildOutgoingDomains includes agent-service host", () => {
  const domains = buildOutgoingDomains("https://tes-agent.onrender.com");
  assertEquals(domains.includes("localhost"), true);
  assertEquals(domains.includes("tes-agent.onrender.com"), true);
});
