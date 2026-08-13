import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { TesEventContext } from "@sea-trial/shared/types/index.ts";
import {
  renderSituationReportSeedCanvas,
  resetCanvasCacheForTests,
} from "../lib/content/canvas-renderer.ts";

const baseContext: TesEventContext = {
  channelId: "C123",
  projectName: "Acme Demo",
  onboardingComplete: false,
  derivedComponents: [],
  dashboardCanvasId: "dash1",
  requirementsCanvasId: "req1",
  deliverablesListId: "list1",
  incidentsListId: "list2",
  infrastructureCanvasId: "infra1",
  situationReportCanvasId: "sr1",
  accountName: "Acme Corp",
};

Deno.test("Situation report template loads with required sections", () => {
  resetCanvasCacheForTests();
  const markdown = renderSituationReportSeedCanvas(baseContext);

  assertEquals(markdown.includes("# Situation Report — Acme Demo"), true);
  assertEquals(markdown.includes("**Generated:**"), true);
  assertEquals(markdown.includes("## Executive summary"), true);
  assertEquals(markdown.includes("## Current situation"), true);
  assertEquals(markdown.includes("## Changelog"), true);
  assertEquals(markdown.includes("No publish yet"), true);
});

Deno.test("Situation report seed includes account display", () => {
  resetCanvasCacheForTests();
  const markdown = renderSituationReportSeedCanvas(baseContext);
  assertEquals(markdown.includes("**Account:** Acme Corp"), true);
});
