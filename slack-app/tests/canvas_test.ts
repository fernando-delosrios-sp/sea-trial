import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  createCanvas,
  updateCanvasSection,
  type SlackCanvasClient,
} from "../lib/canvas.ts";

function mockClient(sections: Array<{ id: string; markdown?: string }>): SlackCanvasClient {
  return {
    canvases: {
      create: async () => ({ ok: true, canvas_id: "canvas-new" }),
      edit: async () => ({}),
      sections: {
        lookup: async () => ({ sections }),
      },
    },
  };
}

Deno.test("Create canvas returns canvas ID from canvas_id field", async () => {
  const client = mockClient([]);
  const id = await createCanvas(client, {
    channelId: "C1",
    title: "Test",
    content: "# Hello",
  });
  assertEquals(id, "canvas-new");
});

Deno.test("Create canvas falls back to nested canvas.id", async () => {
  const client = mockClient([]);
  client.canvases.create = async () => ({ ok: true, canvas: { id: "nested-id" } });
  const id = await createCanvas(client, {
    channelId: "C1",
    title: "Test",
    content: "# Hello",
  });
  assertEquals(id, "nested-id");
});

Deno.test("Create canvas includes API error in message", async () => {
  const client = mockClient([]);
  client.canvases.create = async () => ({ ok: false, error: "missing_scope" });
  await assertRejects(
    () => createCanvas(client, { channelId: "C1", title: "Req", content: "# Hi" }),
    Error,
    'Failed to create canvas "Req": missing_scope',
  );
});

Deno.test("Update canvas section replaces targeted section", async () => {
  const client = mockClient([
    { id: "sec-1", markdown: "## Section MARKER" },
  ]);
  await updateCanvasSection(client, {
    canvasId: "canvas-1",
    sectionMarker: "MARKER",
    newContent: "## Updated",
  });
});

Deno.test("Update canvas section throws when marker not found", async () => {
  const client = mockClient([]);
  await assertRejects(
    () =>
      updateCanvasSection(client, {
        canvasId: "canvas-1",
        sectionMarker: "MISSING",
        newContent: "## Updated",
      }),
    Error,
    "not found",
  );
});

