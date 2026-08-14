import { join } from "std/path/join.ts";
import {
  expandProvisionTargets,
  findMatchingTrigger,
  loadTriggerDefinition,
  parseTriggerListOutput,
  parseTriggersConfig,
  writeTriggerDefinitionFile,
  type ListedTrigger,
  type ProvisionTarget,
} from "../lib/triggers-config.ts";
import { buildWorkflowTriggerEnvVars } from "../lib/workflow-trigger-registry.ts";

export interface SlackCommandRunner {
  run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }>;
}

export async function listTriggers(
  runner: SlackCommandRunner,
  appId: string,
  token: string,
): Promise<string> {
  const result = await runner.run([
    "trigger",
    "list",
    "--app",
    appId,
    "--token",
    token,
    "-s",
    "-f",
    "--no-color",
    "-L",
    "100",
  ]);
  if (result.code !== 0) {
    throw new Error(`slack trigger list failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

export async function resolveTriggerDefPath(
  target: ProvisionTarget,
  rootDir: string,
): Promise<string> {
  if (target.scope === "global" && !target.channelId) {
    return target.triggerDef;
  }

  const trigger = await loadTriggerDefinition(target.triggerDef, rootDir);
  trigger.name = target.title;
  trigger.description = target.description;

  const cacheDir = join(rootDir, ".slack", "cache");
  await Deno.mkdir(cacheDir, { recursive: true });
  const suffix = target.channelId ?? "global";
  const outputPath = join(cacheDir, `trigger-${target.configId}-${suffix}.json`);
  return await writeTriggerDefinitionFile(trigger, outputPath);
}

export async function provisionTarget(
  runner: SlackCommandRunner,
  target: ProvisionTarget,
  existingId: string | undefined,
  appId: string,
  token: string,
  rootDir: string,
): Promise<void> {
  const triggerDef = await resolveTriggerDefPath(target, rootDir);
  const baseArgs = [
    "trigger",
    existingId ? "update" : "create",
    "--app",
    appId,
    "--token",
    token,
    "-s",
    "-f",
    "--no-color",
    "--trigger-def",
    triggerDef,
  ];

  if (existingId) {
    baseArgs.push("--trigger-id", existingId);
  }

  const result = await runner.run(baseArgs);
  if (result.code !== 0) {
    throw new Error(
      `[${target.configId}] slack trigger ${existingId ? "update" : "create"} failed: ${result.stderr || result.stdout}`,
    );
  }

  if (target.scope === "channel" && target.channelId) {
    const triggerId = existingId ?? extractTriggerId(result.stdout);
    if (!triggerId) {
      throw new Error(
        `[${target.configId}] could not resolve trigger id for channel access grant`,
      );
    }

    const accessResult = await runner.run([
      "trigger",
      "access",
      "--trigger-id",
      triggerId,
      "--grant",
      "--channels",
      target.channelId,
      "--app",
      appId,
      "--token",
      token,
      "-s",
      "-f",
      "--no-color",
    ]);

    if (accessResult.code !== 0) {
      throw new Error(
        `[${target.configId}] slack trigger access failed: ${accessResult.stderr || accessResult.stdout}`,
      );
    }
  }
}

function extractTriggerId(output: string): string | undefined {
  const match = output.match(/\s(Ft[A-Z0-9]+)\s+\(shortcut\)/);
  return match?.[1];
}

export async function syncWorkflowTriggerEnvVars(
  runner: SlackCommandRunner,
  appId: string,
  token: string,
  listed: ListedTrigger[],
): Promise<void> {
  const envVars = buildWorkflowTriggerEnvVars(listed);

  for (const [key, value] of Object.entries(envVars)) {
    const result = await runner.run([
      "env",
      "set",
      key,
      value,
      "--app",
      appId,
      "--token",
      token,
      "-s",
    ]);

    if (result.code !== 0) {
      throw new Error(
        `slack env set ${key} failed: ${result.stderr || result.stdout}`,
      );
    }

    console.log(`[workflow-env] set ${key}=${value}`);
  }

  if (!envVars.SLACK_ONBOARDING_TRIGGER_ID) {
    console.log(
      "[workflow-env] Complete Onboarding trigger not listed — skipping SLACK_ONBOARDING_TRIGGER_ID sync",
    );
  }
}

export async function provisionTriggersFromConfig(options: {
  rootDir: string;
  runner: SlackCommandRunner;
  env: Record<string, string | undefined>;
}): Promise<void> {
  const configPath = join(options.rootDir, "triggers.config.yaml");
  const raw = await Deno.readTextFile(configPath);
  const config = parseTriggersConfig(raw);
  const targets = await expandProvisionTargets(
    config,
    options.env,
    options.rootDir,
  );

  const token = options.env.SLACK_SERVICE_TOKEN;
  const appId = options.env.SLACK_APP_ID;
  if (!token || !appId) {
    throw new Error("SLACK_SERVICE_TOKEN and SLACK_APP_ID are required");
  }

  const listedOutput = await listTriggers(options.runner, appId, token);
  const listed = parseTriggerListOutput(listedOutput);

  for (const target of targets) {
    const existing = findMatchingTrigger(listed, target);
    await provisionTarget(
      options.runner,
      target,
      existing?.id,
      appId,
      token,
      options.rootDir,
    );
    console.log(
      `[${target.configId}] ${existing ? "updated" : "created"}: ${target.title}`,
    );
  }

  const listedAfter = parseTriggerListOutput(
    await listTriggers(options.runner, appId, token),
  );
  await syncWorkflowTriggerEnvVars(options.runner, appId, token, listedAfter);
}

if (import.meta.main) {
  const rootDir = Deno.cwd();
  const runner: SlackCommandRunner = {
    async run(args) {
      const command = new Deno.Command("slack", {
        args,
        cwd: rootDir,
        stdout: "piped",
        stderr: "piped",
      });
      const result = await command.output();
      const stdout = new TextDecoder().decode(result.stdout);
      const stderr = new TextDecoder().decode(result.stderr);
      return { code: result.code, stdout, stderr };
    },
  };

  try {
    await provisionTriggersFromConfig({
      rootDir,
      runner,
      env: {
        SLACK_SERVICE_TOKEN: Deno.env.get("SLACK_SERVICE_TOKEN"),
        SLACK_APP_ID: Deno.env.get("SLACK_APP_ID"),
        SLACK_TRIGGER_CHANNEL_IDS: Deno.env.get("SLACK_TRIGGER_CHANNEL_IDS"),
      },
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}
