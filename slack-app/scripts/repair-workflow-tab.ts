/**
 * Backfills a per-channel Onboarding Link Trigger and rewrites the Dashboard
 * Complete onboarding link for an existing TES Event Channel.
 *
 * Does not read canvas markdown. Supply an explicit seed-time TesEventContext
 * snapshot — Slack canvas APIs cannot recover it.
 *
 * Required env (from slack-app/):
 *   SLACK_BOT_TOKEN           — bot token with triggers:write and canvases:write
 *   CHANNEL_ID                — TES Event Channel ID (C…)
 *   DASHBOARD_CANVAS_ID       — Dashboard canvas file ID (F…)
 *   TES_EVENT_CONTEXT_JSON    — compact JSON TesEventContext snapshot (same shape
 *                               as serializeEventContextSnapshot / JSON.stringify)
 *
 * Usage:
 *   SLACK_BOT_TOKEN=xoxb-... CHANNEL_ID=C0BQAN4JVAN DASHBOARD_CANVAS_ID=F0BQ4G09M35 \
 *     TES_EVENT_CONTEXT_JSON='{"channelId":"C…",...}' \
 *     deno run --allow-read --allow-env --allow-net scripts/repair-workflow-tab.ts
 */
import { loadSync } from "std/dotenv/mod.ts";
import { replaceCanvasContent } from "../lib/canvas.ts";
import { deserializeEventContext } from "../lib/event-context.ts";
import { renderDashboardCanvas } from "../lib/content/canvas-renderer.ts";
import { provisionWorkflowChannelAssociation } from "../lib/onboarding-channel-trigger.ts";

loadSync({ export: true, allowEmptyValues: true });

const token = Deno.env.get("SLACK_BOT_TOKEN")?.trim();
const channelId = Deno.env.get("CHANNEL_ID")?.trim();
const dashboardCanvasId = Deno.env.get("DASHBOARD_CANVAS_ID")?.trim();
const eventContextJson = Deno.env.get("TES_EVENT_CONTEXT_JSON")?.trim();

if (!token) {
  console.error("Set SLACK_BOT_TOKEN (bot token with triggers:write and canvases:write)");
  Deno.exit(1);
}
if (!channelId) {
  console.error("Set CHANNEL_ID to the TES Event channel to repair");
  Deno.exit(1);
}
if (!dashboardCanvasId) {
  console.error("Set DASHBOARD_CANVAS_ID to the channel dashboard canvas file ID");
  Deno.exit(1);
}
if (!eventContextJson) {
  console.error(
    "Set TES_EVENT_CONTEXT_JSON to a compact TesEventContext snapshot. Canvas content cannot be read; re-run Create TES Event if you do not have the snapshot.",
  );
  Deno.exit(1);
}

const context = deserializeEventContext(eventContextJson);
if (!context) {
  console.error("TES_EVENT_CONTEXT_JSON is not a valid TesEventContext snapshot");
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
  canvases: {
    edit: (params: Record<string, unknown>) => call("canvases.edit", params),
  },
  workflows: {
    triggers: {
      create: (params: Record<string, unknown>) =>
        call("workflows.triggers.create", params),
      permissions: {
        set: (params: Record<string, unknown>) =>
          call("workflows.triggers.permissions.set", params),
        add: (params: Record<string, unknown>) =>
          call("workflows.triggers.permissions.add", params),
      },
    },
  },
};

console.log(
  `Repairing Dashboard onboarding link for ${channelId} (dashboard ${dashboardCanvasId})`,
);

const url = await provisionWorkflowChannelAssociation(
  client,
  channelId,
  "open_onboarding_workflow",
  dashboardCanvasId,
  { ...context, channelId, dashboardCanvasId },
);

const nextMarkdown = renderDashboardCanvas(
  { ...context, channelId, dashboardCanvasId },
  context.onboarding,
  { onboardingLink: url },
);
await replaceCanvasContent(client, dashboardCanvasId, nextMarkdown);

console.log(`Created Onboarding Link Trigger: ${url}`);
console.log("Done — refresh the channel Dashboard and use Complete onboarding.");
