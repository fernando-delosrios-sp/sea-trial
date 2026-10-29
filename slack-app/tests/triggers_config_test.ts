import { assertEquals, assertRejects, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildProvisionDescription,
  buildProvisionTitle,
  expandProvisionTargets,
  findMatchingTrigger,
  parseTriggerListOutput,
  parseTriggersConfig,
  resolveChannelIds,
} from "../lib/triggers-config.ts";
import {
  type SlackCommandRunner,
  provisionTarget,
  provisionTriggersFromConfig,
} from "../scripts/provision-triggers.ts";

const SAMPLE_CONFIG = `
triggers:
  - id: create-tes-event
    trigger_def: triggers/create_tes_event.ts
    scope: global
    channels: []
    enabled: true
  - id: tes-onboard
    trigger_def: triggers/complete_onboarding.ts
    scope: channel
    channels: []
    enabled: false
  - id: legacy-channel
    trigger_def: triggers/complete_onboarding.ts
    scope: channel
    channels: [C111, C222]
    enabled: true
`;

Deno.test("parseTriggersConfig loads default create_tes_event global enabled", () => {
  const config = parseTriggersConfig(SAMPLE_CONFIG);
  const create = config.triggers.find((entry) => entry.id === "create-tes-event");
  assertEquals(create?.scope, "global");
  assertEquals(create?.enabled, true);
});

Deno.test("parseTriggersConfig rejects invalid scope", () => {
  assertThrows(
    () =>
      parseTriggersConfig(`
triggers:
  - id: bad
    trigger_def: triggers/create_tes_event.ts
    scope: workspace
    enabled: true
`),
    Error,
    'scope must be "global" or "channel"',
  );
});

Deno.test("resolveChannelIds uses SLACK_TRIGGER_CHANNEL_IDS when inline channels empty", () => {
  const entry = {
    id: "tes-onboard",
    trigger_def: "triggers/complete_onboarding.ts",
    scope: "channel" as const,
    channels: [],
    enabled: true,
  };

  assertEquals(
    resolveChannelIds(entry, { SLACK_TRIGGER_CHANNEL_IDS: "C1, C2" }),
    ["C1", "C2"],
  );
});

Deno.test("expandProvisionTargets skips disabled triggers", async () => {
  const config = parseTriggersConfig(SAMPLE_CONFIG);
  const targets = await expandProvisionTargets(config, {}, Deno.cwd());
  const ids = targets.map((target) => target.configId);
  assertEquals(ids.includes("tes-onboard"), false);
});

Deno.test("expandProvisionTargets creates one target per channel id", async () => {
  const config = parseTriggersConfig(SAMPLE_CONFIG);
  const targets = await expandProvisionTargets(config, {}, Deno.cwd());
  const channelTargets = targets.filter((target) =>
    target.configId === "legacy-channel"
  );
  assertEquals(channelTargets.length, 2);
  assertEquals(channelTargets[0].title.includes("C111"), true);
  assertEquals(channelTargets[1].title.includes("C222"), true);
});

Deno.test("Config lists default MVP triggers", async () => {
  const raw = await Deno.readTextFile(
    new URL("../triggers.config.yaml", import.meta.url),
  );
  const config = parseTriggersConfig(raw);
  const create = config.triggers.find((entry) => entry.id === "create-tes-event");
  const onboarding = config.triggers.find((entry) =>
    entry.id === "complete-onboarding"
  );
  assertEquals(create?.scope, "channel");
  assertEquals(create?.channels, []);
  assertEquals(create?.enabled, true);
  assertEquals(onboarding?.scope, "global");
  assertEquals(onboarding?.enabled, true);
  assertEquals(onboarding?.trigger_def, "triggers/complete_onboarding.ts");
  assertEquals(
    config.triggers.some((entry) => entry.id === "tes-onboard"),
    false,
  );
});

Deno.test("expandProvisionTargets from repo config lists Create TES Event when channel env provided", async () => {
  const raw = await Deno.readTextFile(
    new URL("../triggers.config.yaml", import.meta.url),
  );
  const config = parseTriggersConfig(raw);
  const targets = await expandProvisionTargets(
    config,
    { SLACK_TRIGGER_CHANNEL_IDS: "C01234567" },
    Deno.cwd(),
  );
  const titles = targets.map((target) => target.title);
  assertEquals(titles.includes("Create TES Event (C01234567)"), true);
  assertEquals(titles.includes("Complete onboarding"), true);
});

Deno.test("expandProvisionTargets global scope has no channel suffix", async () => {
  const config = parseTriggersConfig(SAMPLE_CONFIG);
  const targets = await expandProvisionTargets(config, {}, Deno.cwd());
  const globalTarget = targets.find((target) => target.configId === "create-tes-event");
  assertEquals(globalTarget?.title, "Create TES Event");
  assertEquals(globalTarget?.channelId, undefined);
});

Deno.test("parseTriggerListOutput extracts trigger ids and titles", () => {
  const listed = parseTriggerListOutput(`
Listing triggers installed to the app...

Shortcut trigger:

   Create TES Event Ft0BNUSJTDEG (shortcut)
   Created: 2026-08-07 13:21:29 +02:00
`);
  assertEquals(listed, [{ title: "Create TES Event", id: "Ft0BNUSJTDEG" }]);
});

Deno.test("findMatchingTrigger matches by title", () => {
  const target = {
    configId: "create-tes-event",
    triggerDef: "triggers/create_tes_event.ts",
    scope: "global" as const,
    title: "Create TES Event",
    description: buildProvisionDescription("create-tes-event", "global"),
  };
  const match = findMatchingTrigger(
    [{ id: "Ft0BNUSJTDEG", title: "Create TES Event" }],
    target,
  );
  assertEquals(match?.id, "Ft0BNUSJTDEG");
});

Deno.test("buildProvisionTitle suffixes channel id for channel scope", () => {
  assertEquals(buildProvisionTitle("TES Onboard", "channel", "C999"), "TES Onboard (C999)");
});

Deno.test("provisionTarget global scope calls create without access grant", async () => {
  const calls: string[][] = [];
  const runner: SlackCommandRunner = {
    async run(args) {
      calls.push(args);
      return {
        code: 0,
        stdout: "Trigger successfully created!\n   Create TES Event FtNEW123 (shortcut)\n",
        stderr: "",
      };
    },
  };

  await provisionTarget(
    runner,
    {
      configId: "create-tes-event",
      triggerDef: "triggers/create_tes_event.ts",
      scope: "global",
      title: "Create TES Event",
      description: buildProvisionDescription("create-tes-event", "global"),
    },
    undefined,
    "A0TEST",
    "xoxp-test",
    Deno.cwd(),
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].includes("create"), true);
  assertEquals(calls[0].includes("--trigger-def"), true);
  assertEquals(calls[0].includes("--title"), false);
});

Deno.test("provisionTarget channel scope grants channel access after create", async () => {
  const calls: string[][] = [];
  const runner: SlackCommandRunner = {
    async run(args) {
      calls.push(args);
      return {
        code: 0,
        stdout: args.includes("access")
          ? ""
          : "Trigger successfully created!\n   TES Onboard (C111) FtCHAN111 (shortcut)\n",
        stderr: "",
      };
    },
  };

  await provisionTarget(
    runner,
    {
      configId: "legacy-channel",
      triggerDef: "triggers/complete_onboarding.ts",
      scope: "channel",
      channelId: "C111",
      title: "TES Onboard (C111)",
      description: buildProvisionDescription("legacy-channel", "channel", "C111"),
    },
    undefined,
    "A0TEST",
    "xoxp-test",
    Deno.cwd(),
  );

  assertEquals(calls.length, 2);
  assertEquals(calls[1].includes("access"), true);
  assertEquals(calls[1].includes("C111"), true);
});

Deno.test("provisionTarget uses update when existing id provided", async () => {
  const calls: string[][] = [];
  const runner: SlackCommandRunner = {
    async run(args) {
      calls.push(args);
      return { code: 0, stdout: "", stderr: "" };
    },
  };

  await provisionTarget(
    runner,
    {
      configId: "create-tes-event",
      triggerDef: "triggers/create_tes_event.ts",
      scope: "global",
      title: "Create TES Event",
      description: buildProvisionDescription("create-tes-event", "global"),
    },
    "FtEXISTING",
    "A0TEST",
    "xoxp-test",
    Deno.cwd(),
  );

  assertEquals(calls[0].includes("update"), true);
  assertEquals(calls[0].includes("FtEXISTING"), true);
});

Deno.test("provisionTriggersFromConfig exits path on CLI failure", async () => {
  const runner: SlackCommandRunner = {
    async run(args) {
      if (args.includes("list")) {
        return { code: 0, stdout: "", stderr: "" };
      }
      return { code: 1, stdout: "", stderr: "boom" };
    },
  };

  await assertRejects(
    () =>
      provisionTriggersFromConfig({
        rootDir: Deno.cwd(),
        runner,
        env: {
          SLACK_SERVICE_TOKEN: "xoxp-test",
          SLACK_APP_ID: "A0TEST",
        },
      }),
    Error,
    "[complete-onboarding] slack trigger create failed: boom",
  );
});

Deno.test("provisionTarget restricts complete-onboarding to app-collaborators on create", async () => {
  const calls: string[][] = [];
  const runner: SlackCommandRunner = {
    async run(args) {
      calls.push(args);
      return {
        code: 0,
        stdout: "Trigger successfully created!\n   Complete onboarding FtONBOARD123 (shortcut)\n",
        stderr: "",
      };
    },
  };

  await provisionTarget(
    runner,
    {
      configId: "complete-onboarding",
      triggerDef: "triggers/complete_onboarding.ts",
      scope: "global",
      title: "Complete onboarding",
      description: buildProvisionDescription("complete-onboarding", "global"),
    },
    undefined,
    "A0TEST",
    "xoxp-test",
    Deno.cwd(),
  );

  assertEquals(calls.length, 2);
  assertEquals(calls[0].includes("create"), true);
  assertEquals(calls[1].includes("access"), true);
  assertEquals(calls[1].includes("--app-collaborators"), true);
  assertEquals(calls[1].includes("FtONBOARD123"), true);
});

Deno.test("provisionTarget restricts complete-onboarding when existing permission is everyone", async () => {
  const calls: string[][] = [];
  const runner: SlackCommandRunner = {
    async run(args) {
      calls.push(args);
      if (args.includes("--info")) {
        return {
          code: 0,
          stdout: JSON.stringify({ ok: true, permission_type: "everyone" }),
          stderr: "",
        };
      }
      return { code: 0, stdout: "", stderr: "" };
    },
  };

  await provisionTarget(
    runner,
    {
      configId: "complete-onboarding",
      triggerDef: "triggers/complete_onboarding.ts",
      scope: "global",
      title: "Complete onboarding",
      description: buildProvisionDescription("complete-onboarding", "global"),
    },
    "FtEXISTINGONBOARD",
    "A0TEST",
    "xoxp-test",
    Deno.cwd(),
  );

  assertEquals(calls.length, 3);
  assertEquals(calls[0].includes("update"), true);
  assertEquals(calls[1].includes("--info"), true);
  assertEquals(calls[2].includes("access"), true);
  assertEquals(calls[2].includes("--app-collaborators"), true);
  assertEquals(calls[2].includes("FtEXISTINGONBOARD"), true);
});

Deno.test("provisionTarget preserves complete-onboarding when existing permission is named_entities", async () => {
  const calls: string[][] = [];
  const runner: SlackCommandRunner = {
    async run(args) {
      calls.push(args);
      if (args.includes("--info")) {
        return {
          code: 0,
          stdout: JSON.stringify({
            ok: true,
            permission_type: "named_entities",
            channel_ids: ["C123"],
          }),
          stderr: "",
        };
      }
      return { code: 0, stdout: "", stderr: "" };
    },
  };

  await provisionTarget(
    runner,
    {
      configId: "complete-onboarding",
      triggerDef: "triggers/complete_onboarding.ts",
      scope: "global",
      title: "Complete onboarding",
      description: buildProvisionDescription("complete-onboarding", "global"),
    },
    "FtEXISTINGONBOARD",
    "A0TEST",
    "xoxp-test",
    Deno.cwd(),
  );

  assertEquals(calls.length, 2);
  assertEquals(calls[0].includes("update"), true);
  assertEquals(calls[1].includes("--info"), true);
  // No 3rd call to grant --app-collaborators because it already has named_entities
});

