export interface SlackCommandRunner {
  run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }>;
}

export const ONBOARDING_ENV_VARS = [
  "SLACK_ONBOARDING_TRIGGER_ID",
  "SLACK_ONBOARDING_TRIGGER_URL",
] as const;

export function buildSlackArgs(
  command: string[],
  appId: string,
  token?: string,
): string[] {
  const args = [...command, "--app", appId, "-s", "-f", "--no-color"];
  if (token) {
    args.push("--token", token);
  }
  return args;
}

export async function listAppEnvVarNames(
  runner: SlackCommandRunner,
  appId: string,
  token?: string,
): Promise<Set<string>> {
  const result = await runner.run(
    buildSlackArgs(["env", "list"], appId, token),
  );
  if (result.code !== 0) {
    throw new Error(`slack env list failed: ${result.stderr || result.stdout}`);
  }

  const names = new Set<string>();
  for (const line of result.stdout.split("\n")) {
    const match = line.match(/^\s+-\s+([^:]+):/);
    if (match) names.add(match[1].trim());
  }
  return names;
}

export async function unsetOnboardingEnvVars(
  runner: SlackCommandRunner,
  appId: string,
  token?: string,
  options: { dryRun?: boolean } = {},
): Promise<string[]> {
  const present = await listAppEnvVarNames(runner, appId, token);
  const unset: string[] = [];

  for (const name of ONBOARDING_ENV_VARS) {
    if (!present.has(name)) {
      console.log(`[skip] ${name} not set`);
      continue;
    }

    if (options.dryRun) {
      console.log(`[dry-run] would unset ${name}`);
      unset.push(name);
      continue;
    }

    const result = await runner.run(
      buildSlackArgs(["env", "unset", name], appId, token),
    );

    if (result.code !== 0) {
      throw new Error(
        `slack env unset ${name} failed: ${result.stderr || result.stdout}`,
      );
    }

    console.log(`[unset] ${name}`);
    unset.push(name);
  }

  return unset;
}
