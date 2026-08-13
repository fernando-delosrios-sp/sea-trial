/**
 * Probes slackLists.create with the compiled Deliverables schema.
 * Usage: SLACK_BOT_TOKEN=xoxb-... deno run --allow-read --allow-env scripts/diagnose-list-create.ts
 */
import { getListName, getSlackListSchema } from "../lib/content/list-compiler.ts";

const token = Deno.env.get("SLACK_BOT_TOKEN")?.trim();
if (!token) {
  console.error("Set SLACK_BOT_TOKEN to a bot token with lists:write scope.");
  Deno.exit(1);
}

async function call(method: string, body: Record<string, string>) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  return await response.json();
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

for (const test of tests) {
  const body: Record<string, string> = {
    name: `diag ${test.name} ${crypto.randomUUID().slice(0, 8)}`,
  };
  if (test.schema) body.schema = JSON.stringify(test.schema);
  const result = await call("slackLists.create", body);
  console.log(
    `${test.name}: ok=${result.ok} error=${result.error ?? "-"} list_id=${result.list_id ?? "-"}`,
  );
}

console.log(`Deliverables list name: ${getListName("deliverables")}`);
console.log(`Full schema columns: ${schema.map((column) => column.key).join(", ")}`);
