/**
 * Probes slackLists.create and native list channel tab attachment.
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
      const fileId = ((row.data as Record<string, unknown> | undefined)?.file_id);
      return `${type}:${label}:${id}:${fileId ?? "?"}`;
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

async function probeApi(
  label: string,
  method: string,
  body: Record<string, string>,
): Promise<boolean> {
  const result = await call(method, body);
  console.log(
    `${label} (${method}): ok=${result.ok} error=${result.error ?? "-"}`,
  );
  return result.ok === true;
}

const schema = getSlackListSchema("deliverables");
const tests: Array<{ name: string; schema: unknown[] | null }> = [
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
  console.log("\n=== Native list channel tab probes ===");
  await printChannelTabs("baseline");

  const tabCreateBody: Record<string, string> = {
    channel_id: channelId,
    name: `diag tab create ${crypto.randomUUID().slice(0, 8)}`,
    schema: JSON.stringify(schema.slice(0, 3)),
  };
  const inlineTabOk = await probeApi(
    "conversations.lists.create (inline)",
    "conversations.lists.create",
    tabCreateBody,
  );
  if (inlineTabOk) {
    await printChannelTabs("after conversations.lists.create inline");
  }

  const standaloneBody: Record<string, string> = {
    name: `diag attach ${crypto.randomUUID().slice(0, 8)}`,
    schema: JSON.stringify(schema.slice(0, 3)),
  };
  const listId = await probeListCreate("standalone create", standaloneBody);
  if (listId) {
    await call("slackLists.access.set", {
      list_id: listId,
      access_level: "write",
      channel_ids: channelId,
    });

    for (const method of [
      "conversations.lists.create",
      "slackLists.attach",
      "conversations.tabs.add",
    ]) {
      const body: Record<string, string> = {
        channel_id: channelId,
        list_id: listId,
      };
      if (method === "conversations.tabs.add") {
        body.type = "list";
        body.entity_id = listId;
        delete body.list_id;
      }
      const ok = await probeApi(`attach via ${method}`, method, body);
      if (ok) {
        await printChannelTabs(`after ${method}`);
        break;
      }
    }
  }

  console.log("\nNote: lists should appear as type:list tabs in conversations.info, not bookmarks.");
} else {
  console.log("\nSet CHANNEL_ID to probe native list channel tabs.");
}

console.log(`\nDeliverables list name: ${getListName("deliverables")}`);
console.log(`Full schema columns: ${schema.map((column) => column.key).join(", ")}`);
