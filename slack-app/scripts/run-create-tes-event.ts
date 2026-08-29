/**
 * Runs the Create TES Event provision flow against a live workspace.
 *
 * Usage (from slack-app/):
 *   deno run --allow-read --allow-env --allow-net scripts/run-create-tes-event.ts
 *
 * Optional env:
 *   PROJECT_NAME          — defaults to "Cursor Smoke {timestamp}"
 *   SUBMITTING_USER_ID    — defaults to UEYQ9MH7Z (workspace owner)
 */
import { loadSync } from "std/dotenv/mod.ts";
import {
  buildInviteUserIds,
  createTesEventChannel,
} from "../lib/channel.ts";
import {
  type ChannelProvisionClient,
  provisionChannel,
} from "../lib/content/channel-provisioner.ts";

loadSync({ export: true, allowEmptyValues: true });

async function resolveToken(): Promise<string> {
  const fromEnv = Deno.env.get("SLACK_BOT_TOKEN")?.trim();
  if (fromEnv) return fromEnv;

  const credentialsPath = `${Deno.env.get("HOME") ?? ""}/.slack/credentials.json`;
  try {
    const credentials = JSON.parse(await Deno.readTextFile(credentialsPath));
    const teamId = Deno.env.get("SLACK_TEAM_ID")?.trim();
    const team = teamId && credentials[teamId]
      ? credentials[teamId]
      : Object.values(credentials).find((entry) =>
        typeof entry === "object" && entry !== null &&
        typeof (entry as Record<string, string>).token === "string"
      );
    const token = (team as Record<string, string> | undefined)?.token?.trim();
    if (token) {
      console.log("Using Slack CLI credentials (SLACK_BOT_TOKEN unset in .env)");
      return token;
    }
  } catch {
    // fall through
  }

  console.error(
    "Set SLACK_BOT_TOKEN in slack-app/.env or run `slack login` for CLI credentials",
  );
  Deno.exit(1);
}

const token = await resolveToken();
const teamId = Deno.env.get("SLACK_TEAM_ID")?.trim();
const submitterUserId = Deno.env.get("SUBMITTING_USER_ID")?.trim() ??
  "UEYQ9MH7Z";
const projectName = Deno.env.get("PROJECT_NAME")?.trim() ??
  `Cursor Smoke ${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;

if (!teamId) {
  console.error("Set SLACK_TEAM_ID in slack-app/.env");
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
  conversations: {
    create: (params: Record<string, unknown>) =>
      call("conversations.create", params),
    invite: (params: Record<string, unknown>) =>
      call("conversations.invite", params),
    list: (params: Record<string, unknown>) =>
      call("conversations.list", params),
    unarchive: (params: Record<string, unknown>) =>
      call("conversations.unarchive", params),
  },
  canvases: {
    create: (params: Record<string, unknown>) =>
      call("canvases.create", params),
    edit: (params: Record<string, unknown>) => call("canvases.edit", params),
    sections: {
      lookup: (params: Record<string, unknown>) =>
        call("canvases.sections.lookup", params),
    },
  },
  slackLists: {
    create: (params: Record<string, unknown>) =>
      call("slackLists.create", params),
    access: {
      set: (params: Record<string, unknown>) =>
        call("slackLists.access.set", params),
    },
    items: {
      create: (params: Record<string, unknown>) =>
        call("slackLists.items.create", params),
      list: (params: Record<string, unknown>) =>
        call("slackLists.items.list", params),
    },
  },
  files: {
    getUploadURLExternal: (params: Record<string, unknown>) =>
      call("files.getUploadURLExternal", params),
    completeUploadExternal: (params: Record<string, unknown>) =>
      call("files.completeUploadExternal", params),
    info: (params: Record<string, unknown>) => call("files.info", params),
  },
  bookmarks: {
    add: (params: Record<string, unknown>) => call("bookmarks.add", params),
  },
  chat: {
    postMessage: (params: Record<string, unknown>) =>
      call("chat.postMessage", params),
  },
  pins: {
    add: (params: Record<string, unknown>) => call("pins.add", params),
  },
  workflows: {
    triggers: {
      create: (params: Record<string, unknown>) =>
        call("workflows.triggers.create", params),
      update: (params: Record<string, unknown>) =>
        call("workflows.triggers.update", params),
      permissions: {
        set: (params: Record<string, unknown>) =>
          call("workflows.triggers.permissions.set", params),
        add: (params: Record<string, unknown>) =>
          call("workflows.triggers.permissions.add", params),
      },
    },
    featured: {
      add: (params: Record<string, unknown>) =>
        call("workflows.featured.add", params),
    },
  },
} as unknown as ChannelProvisionClient;

console.log(`Project: ${projectName}`);
console.log(`Submitter: ${submitterUserId}`);

const { channelId, channelName } = await createTesEventChannel(
  client,
  projectName,
);
console.log(`Channel provisioned: #${channelName} (${channelId})`);

const inviteUserIds = buildInviteUserIds([submitterUserId], submitterUserId);
const inviteResult = await client.conversations.invite({
  channel: channelId,
  users: inviteUserIds.join(","),
});

if (inviteResult.ok === false && inviteResult.error !== "already_in_channel" && inviteResult.error !== "cant_invite_self") {
  console.error(`Invite failed: ${inviteResult.error ?? "unknown error"}`);
  Deno.exit(1);
}
console.log(`Invited: ${inviteUserIds.join(", ")}`);

console.log("Seeding channel objects…");
const context = await provisionChannel(client, {
  channel_id: channelId,
  project_name: projectName,
  account_name: "Cursor Smoke Account",
  salesforce_opportunity_url: "https://example.salesforce.com/opportunity/001",
  member_user_ids: [submitterUserId],
  context_notes: "Created by scripts/run-create-tes-event.ts",
  env: {
    SLACK_TEAM_ID: teamId,
    SLACK_ONBOARDING_TRIGGER_ID: Deno.env.get("SLACK_ONBOARDING_TRIGGER_ID"),
    SLACK_ONBOARDING_TRIGGER_URL: Deno.env.get("SLACK_ONBOARDING_TRIGGER_URL"),
  },
});

console.log("Done.");
console.log(
  JSON.stringify(
    {
      channelName,
      channelId,
      dashboardCanvasId: context.dashboardCanvasId,
      deliverablesListId: context.deliverablesListId,
      incidentsListId: context.incidentsListId,
    },
    null,
    2,
  ),
);
