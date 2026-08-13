/** Builds a Slack archive link to a pinned channel message. */
export function buildPinnedMessageLink(
  channelId: string,
  messageTs: string,
): string {
  const tsPath = messageTs.replace(".", "");
  return `https://app.slack.com/archives/${channelId}/p${tsPath}`;
}

/** Optional workflow shortcut URL configured at deploy time. */
export function resolveOnboardingTriggerUrl(): string | undefined {
  const url = Deno.env.get("SLACK_ONBOARDING_TRIGGER_URL")?.trim();
  return url || undefined;
}

/** Prefers a deploy-time trigger URL, otherwise deep-links to the pinned index message. */
export function buildOnboardingCanvasLink(
  channelId: string,
  pinnedMessageTs?: string,
): string | undefined {
  const triggerUrl = resolveOnboardingTriggerUrl();
  if (triggerUrl) return triggerUrl;
  if (pinnedMessageTs) {
    return buildPinnedMessageLink(channelId, pinnedMessageTs);
  }
  return undefined;
}
