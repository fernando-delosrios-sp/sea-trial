/**
 * Builds Slack outgoingDomains from AGENT_SERVICE_URL plus localhost for dev.
 */
export function buildOutgoingDomains(agentServiceUrl?: string): string[] {
  const domains = new Set<string>(["localhost"]);

  if (agentServiceUrl) {
    try {
      domains.add(new URL(agentServiceUrl).hostname);
    } catch {
      // Ignore malformed URLs at manifest build time.
    }
  }

  return [...domains];
}
