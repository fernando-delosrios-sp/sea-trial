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

Deno.test("buildOutgoingDomains includes localhost only for local dev", () => {
  assertEquals(buildOutgoingDomains(undefined), ["files.slack.com", "localhost"]);
  assertEquals(buildOutgoingDomains("http://localhost:3000"), [
    "files.slack.com",
    "localhost",
  ]);
});

Deno.test("buildOutgoingDomains includes agent-service host without localhost for remote URLs", () => {
  const domains = buildOutgoingDomains("https://tes-agent.onrender.com");
  assertEquals(domains.includes("localhost"), false);
  assertEquals(domains.includes("tes-agent.onrender.com"), true);
});


