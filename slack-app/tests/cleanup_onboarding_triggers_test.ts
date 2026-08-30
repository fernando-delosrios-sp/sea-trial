import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { cleanupOnboardingTriggers } from "../scripts/cleanup-onboarding-triggers.ts";
import type { SlackCommandRunner } from "../scripts/slack-cli-helpers.ts";

Deno.test("cleanup deletes retired Complete Onboarding titles and keeps Create TES Event and Complete onboarding", async () => {
  const deleted: string[] = [];
  const runner: SlackCommandRunner = {
    async run(args) {
      if (args.includes("list")) {
        return {
          code: 0,
          stdout: `
   Create TES Event FtCREATE (shortcut)
   Complete onboarding FtLIVE (shortcut)
   Complete Onboarding FtOLDGLOBAL (shortcut)
   Complete Onboarding (C123) FtCHAN (shortcut)
`,
          stderr: "",
        };
      }
      if (args.includes("delete")) {
        const idIndex = args.indexOf("--trigger-id");
        deleted.push(args[idIndex + 1]);
        return { code: 0, stdout: "", stderr: "" };
      }
      return { code: 0, stdout: "", stderr: "" };
    },
  };

  const summary = await cleanupOnboardingTriggers({
    rootDir: Deno.cwd(),
    runner,
    appId: "A0TEST",
    token: "xoxp-test",
  });

  assertEquals(summary.deleted.sort(), ["FtCHAN", "FtOLDGLOBAL"].sort());
  assertEquals(deleted.sort(), ["FtCHAN", "FtOLDGLOBAL"].sort());
});
