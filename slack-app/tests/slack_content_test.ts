import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCreateTesEventModalView,
  getModalBlockIds,
  parseModalJson,
  resetModalCacheForTests,
} from "../lib/content/modal-compiler.ts";
import {
  getDeliverablesStatusOptions,
  getListColumns,
  getSlackListSchema,
  parseListJson,
  resetListCacheForTests,
} from "../lib/content/list-compiler.ts";
import {
  renderRequirementsCanvas,
  requirementsTemplate,
  resetCanvasCacheForTests,
} from "../lib/content/canvas-renderer.ts";
import {
  pinnedIndexBlocks,
  resetMessageCacheForTests,
} from "../lib/content/message-renderer.ts";
import { getDeliverableStatusChoices } from "../lib/content/domain.ts";
import type { TesEventContext } from "@tes/shared/types/index.ts";

const navOptions = { teamId: "T01234567" };

const baseContext: TesEventContext = {
  channelId: "C123",
  projectName: "Acme",
  onboardingComplete: false,
  derivedComponents: ["IdentityNow"],
  dashboardCanvasId: "dash1",
  requirementsCanvasId: "req1",
  deliverablesListId: "list1",
  incidentsListId: "list2",
  infrastructureCanvasId: "infra1",
  situationReportCanvasId: "sr1",
};

Deno.test("create-tes-event modal block_ids match contract", () => {
  const blockIds = getModalBlockIds("create-tes-event");
  assertEquals(blockIds.length, 5);
  assertEquals(blockIds.includes("project_name"), true);
  assertEquals(blockIds.includes("context_notes"), true);

  const view = buildCreateTesEventModalView();
  assertEquals(view.callback_id, "submit_create_tes_event");
});

Deno.test("onboarding modal block_ids match contract", () => {
  const blockIds = getModalBlockIds("onboarding");
  assertEquals(blockIds.length, 9);
  assertEquals(blockIds.includes("account_name"), true);
  assertEquals(blockIds.includes("sailpoint_suite"), true);
});

Deno.test("invalid modal JSON missing contract throws", () => {
  assertThrows(
    () =>
      parseModalJson(
        JSON.stringify({
          callback_id: "x",
          title: { type: "plain_text", text: "T" },
          submit: { type: "plain_text", text: "S" },
          blocks: [{ type: "input", block_id: "a", element: {} }],
        }),
        "test-modal",
      ),
    Error,
    "contract",
  );
});

Deno.test("deliverables list columns load with domain status options", () => {
  const columns = getListColumns("deliverables");
  const statusColumn = columns.find((c) => c.key === "status");
  assertEquals(statusColumn?.type, "select");
  assertEquals(
    getDeliverablesStatusOptions().map((o) => o.value),
    getDeliverableStatusChoices().map((c) => c.value),
  );
});

Deno.test("deliverables Slack schema matches JSON column names", () => {
  const schema = getSlackListSchema("deliverables");
  assertEquals(schema.length, 9);
  assertEquals(schema[0].name, "Task ID");
  assertEquals(schema[2].name, "Status");
});

Deno.test("invalid list JSON missing columns throws", () => {
  assertThrows(
    () => parseListJson(JSON.stringify({ name: "X", seed: { items: [] } })),
    Error,
    "columns",
  );
});

Deno.test("requirements canvas renders from declarative template", () => {
  const content = renderRequirementsCanvas();
  assertEquals(content, requirementsTemplate());
  assertEquals(content.includes("Requirements Agent"), true);
});

Deno.test("pinned index blocks conditional onboarding button", () => {
  const incomplete = pinnedIndexBlocks(baseContext, navOptions);
  assertEquals(
    incomplete.some((b) => (b as { type: string }).type === "actions"),
    true,
  );

  const complete = pinnedIndexBlocks({ ...baseContext, onboardingComplete: true }, navOptions);
  const publishActions = complete.find(
    (b) => (b as { type: string }).type === "actions",
  ) as { elements: Array<{ action_id: string }> } | undefined;
  assertEquals(publishActions?.elements[0]?.action_id, "publish_situation_report");
});

Deno.test("content loader caches reset for tests", () => {
  resetModalCacheForTests();
  resetListCacheForTests();
  resetCanvasCacheForTests();
  resetMessageCacheForTests();
  assertEquals(getModalBlockIds("create-tes-event").length, 5);
});
