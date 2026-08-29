import { join } from "std/path/join.ts";
import {
  parseTriggerListOutput,
} from "../lib/triggers-config.ts";
import { WORKFLOW_LINK_TRIGGERS } from "../lib/workflow-trigger-registry.ts";
import {
  buildSlackArgs,
  type SlackCommandRunner,
  unsetOnboardingEnvVars,
} from "./slack-cli-helpers.ts";

/** Exact title `Complete Onboarding` — does not match `Complete Onboarding ({channelId})`. */
const ONBOARDING_TRIGGER_TITLE =
  WORKFLOW_LINK_TRIGGERS.open_onboarding_workflow.triggerName;

async function listShortcutTriggers(
  runner: SlackCommandRunner,
  appId: string,
  token?: string,
): Promise<string> {
  const args = buildSlackArgs(
    ["trigger", "list", "-L", "100", "--type", "shortcut"],
    appId,
    token,
  );
  const result = await runner.run(args);
  if (result.code !== 0) {
    throw new Error(`slack trigger list failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

export async function cleanupOnboardingTriggers(options: {
  rootDir: string;
  runner: SlackCommandRunner;
  appId: string;
  token?: string;
  dryRun?: boolean;
}): Promise<{ deleted: string[]; unset: string[] }> {
  const listedOutput = await listShortcutTriggers(
    options.runner,
    options.appId,
    options.token,
  );
  const listed = parseTriggerListOutput(listedOutput);
  const toDelete = listed.filter((trigger) =>
    trigger.title === ONBOARDING_TRIGGER_TITLE
  );

  const deleted: string[] = [];

  if (toDelete.length === 0) {
    console.log(
      `[ok] No "${ONBOARDING_TRIGGER_TITLE}" triggers found (already clean)`,
    );
  }

  for (const trigger of toDelete) {
    if (options.dryRun) {
      console.log(`[dry-run] would delete ${trigger.title} ${trigger.id}`);
      deleted.push(trigger.id);
      continue;
    }

    const result = await options.runner.run(
      buildSlackArgs(
        ["trigger", "delete", "--trigger-id", trigger.id],
        options.appId,
        options.token,
      ),
    );

    if (result.code !== 0) {
      throw new Error(
        `slack trigger delete ${trigger.id} failed: ${result.stderr || result.stdout}`,
      );
    }

    console.log(`[deleted] ${trigger.title} ${trigger.id}`);
    deleted.push(trigger.id);
  }

  const unset = await unsetOnboardingEnvVars(
    options.runner,
    options.appId,
    options.token,
    { dryRun: options.dryRun },
  );

  return { deleted, unset };
}

if (import.meta.main) {
  const dryRun = Deno.args.includes("--dry-run");
  const rootDir = Deno.cwd();
  const token = Deno.env.get("SLACK_SERVICE_TOKEN")?.trim() || undefined;
  const appId = Deno.env.get("SLACK_APP_ID")?.trim() ??
    await (async () => {
      const appsPath = join(rootDir, ".slack", "apps.json");
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
        const match = entries.find(([, app]) =>
          app.team_domain === apps.default
        );
        if (match) return match[1].app_id;
      }
      return entries[0][1].app_id;
    })();

  const runner: SlackCommandRunner = {
    async run(args) {
      const command = new Deno.Command("slack", {
        args,
        cwd: rootDir,
        stdout: "piped",
        stderr: "piped",
      });
      const result = await command.output();
      return {
        code: result.code,
        stdout: new TextDecoder().decode(result.stdout),
        stderr: new TextDecoder().decode(result.stderr),
      };
    },
  };

  try {
    const summary = await cleanupOnboardingTriggers({
      rootDir,
      runner,
      appId,
      token,
      dryRun,
    });

    console.log(
      `\nCleanup complete: deleted ${summary.deleted.length} trigger(s), unset ${summary.unset.length} env var(s).`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}
