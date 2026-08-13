import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  EXPECTED_LIST_COLUMN_TYPES,
  EXPECTED_MESSAGE_BLOCK_TYPES,
  EXPECTED_MODAL_INPUT_ELEMENTS,
  listRegisteredDomainRefs,
  loadListCatalog,
  loadMessageCatalog,
  loadModalCatalog,
  resetCapabilityCatalogCacheForTests,
} from "../lib/content/capability-catalog.ts";
import {
  validateCanvasTemplateSource,
  validateListColumns,
  validateMessageBlocks,
  validateModalBlocks,
  validateModalDynamicOverlay,
} from "../lib/content/capability-validator.ts";
import { readContentText } from "../lib/content/paths.ts";
import {
  buildCreateTesEventModalView,
  parseModalJson,
  resetModalCacheForTests,
} from "../lib/content/modal-compiler.ts";
import {
  getDeliverablesStatusOptions,
  getSlackListSchema,
  parseListJson,
  resetListCacheForTests,
} from "../lib/content/list-compiler.ts";
import { getDeliverableStatusChoices } from "../lib/content/domain.ts";

Deno.test("catalog parity: modal input elements match full Slack surface", () => {
  const catalog = loadModalCatalog();
  assertEquals(
    Object.keys(catalog.input_elements).sort(),
    [...EXPECTED_MODAL_INPUT_ELEMENTS].sort(),
  );
});

Deno.test("catalog parity: list column types match full Slack surface", () => {
  const catalog = loadListCatalog();
  assertEquals(
    Object.keys(catalog.column_types).sort(),
    [...EXPECTED_LIST_COLUMN_TYPES].sort(),
  );
});

Deno.test("catalog parity: message block types match full Slack surface", () => {
  const catalog = loadMessageCatalog();
  assertEquals(
    Object.keys(catalog.block_types).sort(),
    [...EXPECTED_MESSAGE_BLOCK_TYPES].sort(),
  );
});

Deno.test("unknown modal element type rejected", () => {
  assertThrows(
    () =>
      validateModalBlocks(
        [{
          type: "input",
          block_id: "x",
          element: { type: "not_a_slack_type", action_id: "value" },
        }],
        "test-modal",
      ),
    Error,
    "unknown element.type",
  );
});

Deno.test("modal rich_text_input and file_input compile through", () => {
  const modal = parseModalJson(JSON.stringify({
    callback_id: "test",
    title: { type: "plain_text", text: "T" },
    submit: { type: "plain_text", text: "S" },
    blocks: [
      {
        type: "input",
        block_id: "rich",
        element: { type: "rich_text_input", action_id: "value" },
      },
      {
        type: "input",
        block_id: "file",
        element: { type: "file_input", action_id: "value" },
      },
      {
        type: "input",
        block_id: "checks",
        element: {
          type: "checkboxes",
          action_id: "value",
          options: [{ text: { type: "plain_text", text: "A" }, value: "a" }],
        },
      },
    ],
    contract: { block_ids: ["rich", "file", "checks"] },
  }), "test-modal");

  assertEquals(modal.blocks.length, 3);
});

Deno.test("text list column with options rejected", () => {
  assertThrows(
    () =>
      validateListColumns(
        [{ key: "a", name: "A", type: "text", options: { choices: [] } }],
        "test-list",
      ),
    Error,
    'must not contain property "options"',
  );
});

Deno.test("flat list options array rejected", () => {
  assertThrows(
    () =>
      parseListJson(JSON.stringify({
        name: "X",
        columns: [{
          key: "s",
          name: "S",
          type: "select",
          options: [{ value: "a", label: "A" }],
        }],
        seed: { items: [] },
        behavior: { field_change: [] },
      })),
    Error,
    "Slack shape",
  );
});

Deno.test("multi_select rating checkbox list columns compile through", () => {
  const list = parseListJson(JSON.stringify({
    name: "Full",
    columns: [
      {
        key: "labels",
        name: "Labels",
        type: "multi_select",
        options: {
          format: "multi_select",
          choices: [{ value: "p0", label: "P0" }],
        },
      },
      {
        key: "ready",
        name: "Ready?",
        type: "checkbox",
      },
      {
        key: "rating",
        name: "Rating",
        type: "rating",
        options: { emoji: ":star:", max: 5 },
      },
    ],
    seed: { items: [] },
    behavior: { field_change: [] },
  }));

  assertEquals(list.columns.length, 3);
  assertEquals(list.columns[0].type, "multi_select");
});

Deno.test("options_ref resolves and conflicting inline options rejected", () => {
  assertEquals(
    getDeliverablesStatusOptions().map((o) => o.value),
    getDeliverableStatusChoices().map((c) => c.value),
  );

  assertThrows(
    () =>
      parseListJson(JSON.stringify({
        name: "X",
        columns: [{
          key: "s",
          name: "S",
          type: "select",
          options_ref: "@domain/deliverable-statuses",
          options: { format: "single_select", choices: [] },
        }],
        seed: { items: [] },
        behavior: { field_change: [] },
      })),
    Error,
    "both options_ref and inline options",
  );
});

Deno.test("unknown domain ref rejected", () => {
  assertThrows(
    () =>
      parseListJson(JSON.stringify({
        name: "X",
        columns: [{
          key: "s",
          name: "S",
          type: "select",
          options_ref: "@domain/unknown",
        }],
        seed: { items: [] },
        behavior: { field_change: [] },
      })),
    Error,
    "unknown options_ref",
  );

  assertThrows(
    () =>
      validateModalDynamicOverlay(
        { sailpoint_suite: { options_ref: "@domain/unknown" } },
        "test-modal",
      ),
    Error,
    "unknown ref",
  );
});

Deno.test("domain refs registered", () => {
  const refs = listRegisteredDomainRefs().sort();
  assertEquals(refs, [
    "@domain/customer-deliverable-statuses",
    "@domain/deliverable-statuses",
    "@domain/sailpoint-suites",
  ]);
});

Deno.test("message unknown block type rejected", () => {
  assertThrows(
    () => validateMessageBlocks([{ type: "not_a_block" }], "test-message"),
    Error,
    "unknown block.type",
  );
});

Deno.test("canvas forbidden metadata rejected in author template", () => {
  assertThrows(
    () =>
      validateCanvasTemplateSource(
        "# Title\n<!-- tes-event-context -->\n",
        "canvases/bad.hbs.md",
      ),
    Error,
    "forbidden pattern",
  );

  validateCanvasTemplateSource("# Title\n", "canvases/ok.hbs.md");
});

const BUNDLED_CANVAS_TEMPLATE_PATHS = [
  "canvases/dashboard.hbs.md",
  "canvases/requirements.hbs.md",
  "canvases/infrastructure.hbs.md",
  "canvases/situation-report.hbs.md",
  "canvases/delivery.hbs.md",
] as const;

Deno.test("bundled canvas templates pass forbidden-pattern validation", () => {
  for (const path of BUNDLED_CANVAS_TEMPLATE_PATHS) {
    validateCanvasTemplateSource(readContentText(path), path);
  }
});

Deno.test("deliverables slack schema includes status options choices", () => {
  const schema = getSlackListSchema("deliverables");
  const status = schema.find((c) => c.key === "status");
  assertEquals(status?.type, "select");
  assertEquals(
    status?.options?.choices?.length,
    getDeliverableStatusChoices().length,
  );
});

Deno.test("modal plain_text_input with forbidden options property rejected", () => {
  assertThrows(
    () =>
      validateModalBlocks(
        [{
          type: "input",
          block_id: "x",
          element: {
            type: "plain_text_input",
            action_id: "value",
            options: [],
          },
        }],
        "test-modal",
      ),
    Error,
    'must not contain property "options"',
  );
});

Deno.test("message rich_text block accepted", () => {
  validateMessageBlocks(
    [{
      type: "rich_text",
      elements: [{
        type: "rich_text_section",
        elements: [{ type: "text", text: "Hello" }],
      }],
    }],
    "test-message",
  );
});

Deno.test("content files reference schemas with catalog type enums", async () => {
  const modalSchema = JSON.parse(
    await Deno.readTextFile("schemas/content/modal.schema.json"),
  );
  const listSchema = JSON.parse(
    await Deno.readTextFile("schemas/content/list.schema.json"),
  );
  const messageSchema = JSON.parse(
    await Deno.readTextFile("schemas/content/message-blocks.schema.json"),
  );

  const modalEnum =
    modalSchema.properties.blocks.items.properties.element.properties.type.enum;
  const listEnum = listSchema.properties.columns.items.properties.type.enum;
  const messageEnum = messageSchema.items.properties.type.enum;

  assertEquals(modalEnum.sort(), [...EXPECTED_MODAL_INPUT_ELEMENTS].sort());
  assertEquals(listEnum.sort(), [...EXPECTED_LIST_COLUMN_TYPES].sort());
  assertEquals(messageEnum.sort(), [...EXPECTED_MESSAGE_BLOCK_TYPES].sort());

  const createModal = JSON.parse(
    await Deno.readTextFile("content/modals/create-tes-event.json"),
  );
  const deliverables = JSON.parse(
    await Deno.readTextFile("content/lists/deliverables.json"),
  );
  const messageMeta = JSON.parse(
    await Deno.readTextFile("content/messages/pinned-index.meta.json"),
  );

  assertEquals(
    createModal.$schema,
    "../../schemas/content/modal.schema.json",
  );
  assertEquals(
    deliverables.$schema,
    "../../schemas/content/list.schema.json",
  );
  assertEquals(
    messageMeta.$schema,
    "../../schemas/content/message-blocks.schema.json",
  );
});

Deno.test("incidents list inline select uses Slack options shape", () => {
  const schema = getSlackListSchema("incidents");
  const status = schema.find((c) => c.key === "status");
  assertEquals(status?.options?.format, "single_select");
  assertEquals(status?.options?.choices?.length, 3);
});

Deno.test("existing create-tes-event modal loads under catalog validation", () => {
  resetModalCacheForTests();
  resetListCacheForTests();
  resetCapabilityCatalogCacheForTests();
  const view = buildCreateTesEventModalView();
  assertEquals(view.type, "modal");
});
