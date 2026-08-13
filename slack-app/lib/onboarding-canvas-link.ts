/** Builds a Slack archive link to a pinned channel message. */
export function buildPinnedMessageLink(
  channelId: string,
  messageTs: string,
): string {
  const tsPath = messageTs.replace(".", "");
  return `https://app.slack.com/archives/${channelId}/p${tsPath}`;
}

/** Optional workflow shortcut URL configured at deploy time. */
export function resolveOnboardingTriggerUrl(
  env?: Record<string, string | undefined>,
): string | undefined {
  const url = env?.["SLACK_ONBOARDING_TRIGGER_URL"]?.trim();
  return url || undefined;
}

/** Prefers a deploy-time trigger URL, otherwise deep-links to the pinned index message. */
export function buildOnboardingCanvasLink(
  channelId: string,
  pinnedMessageTs?: string,
  env?: Record<string, string | undefined>,
): string | undefined {
  const triggerUrl = resolveOnboardingTriggerUrl(env);
  if (triggerUrl) return triggerUrl;
  if (pinnedMessageTs) {
    return buildPinnedMessageLink(channelId, pinnedMessageTs);
  }
  return undefined;
}
