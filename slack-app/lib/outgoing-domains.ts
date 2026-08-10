/**
 * Builds Slack outgoingDomains from AGENT_SERVICE_URL, OTLP endpoint, and localhost for dev.
 * Canvas banner uploads POST bytes to files.slack.com and must be allowlisted for Deno runtime fetch.
 */
export function buildOutgoingDomains(
  agentServiceUrl?: string,
  otlpEndpoint?: string,
): string[] {
  const domains = new Set<string>(["files.slack.com"]);

  if (agentServiceUrl) {
    try {
      const hostname = new URL(agentServiceUrl).hostname;
      domains.add(hostname);
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        domains.add("localhost");
      }
    } catch {
      // Ignore malformed URLs at manifest build time.
    }
  } else {
    domains.add("localhost");
  }

  if (otlpEndpoint) {
    try {
      domains.add(new URL(otlpEndpoint).hostname);
    } catch {
      // Ignore malformed OTLP URLs at manifest build time.
    }
  }

  return [...domains];
}


