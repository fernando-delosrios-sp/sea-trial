import { join } from "std/path/join.ts";

const appsPath = join(Deno.cwd(), ".slack", "apps.json");
const raw = await Deno.readTextFile(appsPath);
const apps = JSON.parse(raw) as {
  apps: Record<string, { app_id: string; team_domain?: string }>;
  default?: string;
};

const entries = Object.entries(apps.apps);
if (entries.length === 0) {
  throw new Error("No apps found in .slack/apps.json");
}

if (apps.default) {
  const match = entries.find(([, app]) => app.team_domain === apps.default);
  if (match) {
    console.log(match[1].app_id);
    Deno.exit(0);
  }
}

console.log(entries[0][1].app_id);
