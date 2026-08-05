/**
 * Builds Slack outgoingDomains from AGENT_SERVICE_URL, OTLP endpoint, and localhost for dev.
 */
export function buildOutgoingDomains(
  agentServiceUrl?: string,
  otlpEndpoint?: string,
): string[] {
  const domains = new Set<string>(["localhost"]);

  if (agentServiceUrl) {
    try {
      domains.add(new URL(agentServiceUrl).hostname);
    } catch {
      // Ignore malformed URLs at manifest build time.
    }
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
