import type { ListedTrigger } from "./triggers-config.ts";

export interface WorkflowTriggerLinkConfig {
  envVar: string;
  triggerName: string;
}

/** Maps composition workflow `link` keys to deploy-time trigger identity. */
export const WORKFLOW_LINK_TRIGGERS: Record<string, WorkflowTriggerLinkConfig> = {
  open_onboarding_workflow: {
    envVar: "SLACK_ONBOARDING_TRIGGER_ID",
    triggerName: "Complete Onboarding",
  },
};

export function isKnownWorkflowLink(link: string): boolean {
  return link in WORKFLOW_LINK_TRIGGERS;
}

/** Resolves a workflow step link to a deploy-time trigger ID. */
export function resolveWorkflowTriggerId(
  link: string,
  env?: Record<string, string | undefined>,
  listedTriggers?: ListedTrigger[],
): string | undefined {
  const config = WORKFLOW_LINK_TRIGGERS[link];
  if (!config) return undefined;

  const fromEnv = env?.[config.envVar]?.trim();
  if (fromEnv) return fromEnv;

  const match = listedTriggers?.find((trigger) =>
    trigger.title === config.triggerName
  );
  return match?.id;
}

export function resolveWorkflowTriggerShareUrl(
  _triggerId: string,
  env?: Record<string, string | undefined>,
): string | undefined {
  const fromEnv = env?.["SLACK_ONBOARDING_TRIGGER_URL"]?.trim();
  return fromEnv || undefined;
}

/** Builds Slack app env vars for deploy-time workflow triggers from trigger list output. */
export function buildWorkflowTriggerEnvVars(
  listedTriggers: ListedTrigger[],
): Record<string, string> {
  const env: Record<string, string> = {};

  for (const link of Object.keys(WORKFLOW_LINK_TRIGGERS)) {
    const config = WORKFLOW_LINK_TRIGGERS[link];
    const triggerId = resolveWorkflowTriggerId(link, {}, listedTriggers);
    if (!triggerId) continue;

    env[config.envVar] = triggerId;
  }

  return env;
}
