/**
 * Puts a TES Event Context Store row and grants the global Complete onboarding
 * shortcut to an existing TES Event Channel. Does not create a per-channel trigger.
 *
 * Required env (from slack-app/):
 *   SLACK_BOT_TOKEN                  — bot token with datastore:write and triggers:write
 *   CHANNEL_ID                       — TES Event Channel ID (C…)
 *   SLACK_ONBOARDING_TRIGGER_ID      — global Complete onboarding trigger id
 *   TES_EVENT_CONTEXT_JSON           — compact JSON TesEventContext snapshot
 *
 * Usage:
 *   SLACK_BOT_TOKEN=xoxb-... CHANNEL_ID=C0BQAN4JVAN \
 *     SLACK_ONBOARDING_TRIGGER_ID=Ft… \
 *     TES_EVENT_CONTEXT_JSON='{"channelId":"C…",...}' \
 *     deno run --allow-read --allow-env --allow-net scripts/repair-tes-event-context.ts
 */
import { loadSync } from "std/dotenv/mod.ts";
import { resolveRepairEventContext } from "../lib/repair-onboarding-trigger.ts";
import { repairTesEventChannel } from "../lib/repair-tes-event-context.ts";

loadSync({ export: true, allowEmptyValues: true });

const token = Deno.env.get("SLACK_BOT_TOKEN")?.trim();
const channelId = Deno.env.get("CHANNEL_ID")?.trim();

if (!token) {
  console.error("Set SLACK_BOT_TOKEN (bot token with datastore:write and triggers:write)");
  Deno.exit(1);
}
if (!channelId) {
  console.error("Set CHANNEL_ID to the TES Event channel to repair");
  Deno.exit(1);
}

let context;
try {
  context = resolveRepairEventContext({
    TES_EVENT_CONTEXT_JSON: Deno.env.get("TES_EVENT_CONTEXT_JSON"),
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  Deno.exit(1);
}

type SlackResponse = Record<string, unknown>;

async function call(
  method: string,
  body: Record<string, unknown>,
): Promise<SlackResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    params.set(
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    );
  }

  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  return await response.json() as SlackResponse;
}

const client = {
  apiCall: (method: string, params: Record<string, unknown>) =>
    call(method, params),
  apps: {
    datastore: {
      get: (params: Record<string, unknown>) =>
        call("apps.datastore.get", params),
      put: (params: Record<string, unknown>) =>
        call("apps.datastore.put", params),
    },
  },
  workflows: {
    triggers: {
      permissions: {
        set: (params: Record<string, unknown>) =>
          call("workflows.triggers.permissions.set", params),
        add: (params: Record<string, unknown>) =>
          call("workflows.triggers.permissions.add", params),
      },
    },
  },
};

console.log(`Repairing TES Event Context Store for ${channelId}`);

await repairTesEventChannel(
  client,
  { ...context, channelId },
  {
    SLACK_ONBOARDING_TRIGGER_ID: Deno.env.get("SLACK_ONBOARDING_TRIGGER_ID"),
  },
);

console.log("Wrote store row and granted Complete onboarding. No per-channel trigger was created.");
