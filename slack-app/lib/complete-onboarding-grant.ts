import type { ListedTrigger } from "./triggers-config.ts";

/** Live global shortcut title — not deleted by cleanup. */
export const COMPLETE_ONBOARDING_TRIGGER_NAME = "Complete onboarding";

export const COMPLETE_ONBOARDING_TRIGGER_ENV = "SLACK_ONBOARDING_TRIGGER_ID";

/** Retired deploy-time title (capital O). Cleanup deletes this, not the live shortcut. */
export const RETIRED_COMPLETE_ONBOARDING_TITLE = "Complete Onboarding";

export const MISSING_COMPLETE_ONBOARDING_TRIGGER_ID_ERROR =
  "Complete onboarding trigger id is missing. Deploy with complete-onboarding enabled, then repair or re-seed the channel.";

export interface CompleteOnboardingGrantClient {
  workflows: {
    triggers: {
      permissions: {
        set?: (payload: {
          trigger_id: string;
          permission_type?: string;
          channel_ids?: string[];
        }) => Promise<{ ok?: boolean; error?: string }>;
        add: (payload: {
          trigger_id: string;
          channel_ids?: string[];
        }) => Promise<{ ok?: boolean; error?: string }>;
      };
    };
  };
}

export function resolveCompleteOnboardingTriggerId(
  env?: Record<string, string | undefined>,
  listedTriggers?: ListedTrigger[],
): string | undefined {
  const fromEnv = env?.[COMPLETE_ONBOARDING_TRIGGER_ENV]?.trim();
  if (fromEnv) return fromEnv;

  const match = listedTriggers?.find((trigger) =>
    trigger.title === COMPLETE_ONBOARDING_TRIGGER_NAME
  );
  return match?.id;
}

export function buildCompleteOnboardingTriggerEnvVars(
  listedTriggers: ListedTrigger[],
): Record<string, string> {
  const triggerId = resolveCompleteOnboardingTriggerId({}, listedTriggers);
  if (!triggerId) return {};
  return { [COMPLETE_ONBOARDING_TRIGGER_ENV]: triggerId };
}

export function isRetiredOnboardingTriggerTitle(title: string): boolean {
  if (title === "Create TES Event") return false;
  if (title === COMPLETE_ONBOARDING_TRIGGER_NAME) return false;
  if (title === RETIRED_COMPLETE_ONBOARDING_TITLE) return true;
  return /^Complete Onboarding \(.+\)$/.test(title);
}

async function callWorkflowApi(
  client: CompleteOnboardingGrantClient,
  method: string,
  params: Record<string, unknown>,
): Promise<{ ok?: boolean; error?: string }> {
  if (method === "workflows.triggers.permissions.set") {
    const set = client.workflows.triggers.permissions.set;
    if (set) {
      return set(params as {
        trigger_id: string;
        permission_type?: string;
        channel_ids?: string[];
      });
    }
  }

  if (method === "workflows.triggers.permissions.add") {
    return client.workflows.triggers.permissions.add(
      params as { trigger_id: string; channel_ids?: string[] },
    );
  }

  throw new Error(`Client does not support ${method}`);
}

/**
 * Grants channel run access for the global Complete onboarding shortcut.
 *
 * `permissions.add` only works when the trigger is already `named_entities`.
 * Otherwise `permissions.set` must include `channel_ids` in the same call.
 */
export async function grantCompleteOnboardingToChannel(
  client: CompleteOnboardingGrantClient,
  triggerId: string,
  channelId: string,
): Promise<void> {
  const addResponse = await callWorkflowApi(
    client,
    "workflows.triggers.permissions.add",
    {
      trigger_id: triggerId,
      channel_ids: [channelId],
    },
  );

  if (addResponse.ok) {
    return;
  }

  if (addResponse.error === "invalid_permission_type") {
    const setResponse = await callWorkflowApi(
      client,
      "workflows.triggers.permissions.set",
      {
        trigger_id: triggerId,
        permission_type: "named_entities",
        channel_ids: [channelId],
      },
    );

    if (!setResponse.ok) {
      throw new Error(
        `Failed to grant Complete onboarding to channel ${channelId}${
          setResponse.error ? `: ${setResponse.error}` : ""
        }`,
      );
    }
    return;
  }

  throw new Error(
    `Failed to grant Complete onboarding to channel ${channelId}${
      addResponse.error ? `: ${addResponse.error}` : ""
    }`,
  );
}

export function requireCompleteOnboardingTriggerId(
  env?: Record<string, string | undefined>,
): string {
  const triggerId = resolveCompleteOnboardingTriggerId(env);
  if (!triggerId) {
    throw new Error(MISSING_COMPLETE_ONBOARDING_TRIGGER_ID_ERROR);
  }
  return triggerId;
}
