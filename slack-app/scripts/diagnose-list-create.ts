/**
 * Probes slackLists.create and list channel attachment.
 *
 * Usage:
 *   SLACK_BOT_TOKEN=xoxb-... deno run --allow-read --allow-env --allow-net scripts/diagnose-list-create.ts
 *
 * With channel tab inspection:
 *   SLACK_BOT_TOKEN=xoxb-... CHANNEL_ID=C... deno run --allow-read --allow-env --allow-net scripts/diagnose-list-create.ts
 */
import { getListName, getSlackListSchema } from "../lib/content/list-compiler.ts";

const token = Deno.env.get("SLACK_BOT_TOKEN")?.trim();
if (!token) {
  console.error("Set SLACK_BOT_TOKEN to a bot token with lists:write scope.");
  Deno.exit(1);
}

const channelId = Deno.env.get("CHANNEL_ID")?.trim();

async function call(method: string, body: Record<string, string>) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  return await response.json() as Record<string, unknown>;
}

function tabSummary(channel: Record<string, unknown> | undefined): string {
  const properties = channel?.properties as Record<string, unknown> | undefined;
  const tabs = properties?.tabs;
  if (!Array.isArray(tabs) || tabs.length === 0) {
    return "(no tabs)";
  }
  return tabs
    .map((tab) => {
      const row = tab as Record<string, unknown>;
      const type = typeof row.type === "string" ? row.type : "?";
      const label = typeof row.label === "string" ? row.label : "?";
      const id = typeof row.id === "string" ? row.id : "?";
      return `${type}:${label}:${id}`;
    })
    .join(", ");
}

async function printChannelTabs(label: string): Promise<void> {
  if (!channelId) return;
  const info = await call("conversations.info", { channel: channelId });
  const channel = info.channel as Record<string, unknown> | undefined;
  console.log(`${label} conversations.info tabs → ${tabSummary(channel)}`);
}

async function probeListCreate(
  label: string,
  body: Record<string, string>,
): Promise<string | undefined> {
  const result = await call("slackLists.create", body);
  const listId = typeof result.list_id === "string" ? result.list_id : undefined;
  console.log(
    `${label}: ok=${result.ok} error=${result.error ?? "-"} list_id=${listId ?? "-"}`,
  );
  return listId;
}

const schema = getSlackListSchema("deliverables");
const tests: Array<{ name: string; schema: unknown[] | null; channel_id?: string }> = [
  { name: "minimal", schema: null },
  {
    name: "primary_only",
    schema: [{ key: "task_id", name: "Task ID", type: "text", is_primary_column: true }],
  },
  { name: "first_three", schema: schema.slice(0, 3) },
  { name: "first_six", schema: schema.slice(0, 6) },
  { name: "full", schema },
];

console.log("=== Schema probes (no channel attachment) ===");
for (const test of tests) {
  const body: Record<string, string> = {
    name: `diag ${test.name} ${crypto.randomUUID().slice(0, 8)}`,
  };
  if (test.schema) body.schema = JSON.stringify(test.schema);
  await probeListCreate(test.name, body);
}

if (channelId) {
  console.log("\n=== Channel attachment probes ===");
  await printChannelTabs("baseline");

  const createBody: Record<string, string> = {
    name: `diag channel attach ${crypto.randomUUID().slice(0, 8)}`,
    schema: JSON.stringify(schema.slice(0, 3)),
  };

  const withoutChannelId = await probeListCreate(
    "create_without_channel_id",
    createBody,
  );
  if (withoutChannelId) {
    await call("slackLists.access.set", {
      list_id: withoutChannelId,
      access_level: "write",
      channel_ids: channelId,
    });
    console.log(`access.set (write) for ${withoutChannelId} → channel ${channelId}`);
    await printChannelTabs("after create + access.set (no channel_id on create)");
  }

  const withChannelBody = {
    ...createBody,
    name: `diag channel_id param ${crypto.randomUUID().slice(0, 8)}`,
    channel_id: channelId,
  };
  const withChannelId = await probeListCreate(
    "create_with_channel_id",
    withChannelBody,
  );
  if (withChannelId) {
    await printChannelTabs("after create with channel_id param");
  }

  const bookmarkListId = await probeListCreate(
    "bookmark_probe_list",
    {
      name: `diag bookmark ${crypto.randomUUID().slice(0, 8)}`,
      schema: JSON.stringify(schema.slice(0, 3)),
    },
  );
  if (bookmarkListId) {
    const teamInfo = await call("auth.test", {});
    const teamId = typeof teamInfo.team_id === "string" ? teamInfo.team_id : "";
    const bookmark = await call("bookmarks.add", {
      channel_id: channelId,
      title: "Diag Deliverables",
      type: "link",
      link: `https://app.slack.com/lists/${teamId}/${bookmarkListId}`,
    });
    console.log(
      `bookmarks.add: ok=${bookmark.ok} error=${bookmark.error ?? "-"}`,
    );
    await printChannelTabs("after bookmarks.add");
  }
} else {
  console.log("\nSet CHANNEL_ID to probe list channel tabs and bookmarks.add.");
}

console.log(`\nDeliverables list name: ${getListName("deliverables")}`);
console.log(`Full schema columns: ${schema.map((column) => column.key).join(", ")}`);
