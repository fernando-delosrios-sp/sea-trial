import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  createCanvas,
  extractProofFromRequirementsCanvas,
  setCanvasChannelAccess,
  updateCanvasSection,
  upsertDeliveryProofSection,
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

Deno.test("Create canvas retries with suffix on name collision", async () => {
  const titles: string[] = [];
  const client = mockClient([]);
  client.canvases.create = async (params) => {
    titles.push(params.title);
    if (params.title === "Dashboard") {
      return { ok: false, error: "name_taken" };
    }
    return { ok: true, canvas_id: "canvas-suffixed" };
  };

  const id = await createCanvas(client, {
    channelId: "C1",
    title: "Dashboard",
    content: "# Hello",
  });

  assertEquals(id, "canvas-suffixed");
  assertEquals(titles, ["Dashboard", "Dashboard1"]);
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

Deno.test("setCanvasChannelAccess grants write access to channel by default", async () => {
  let capturedParams: Record<string, unknown> | undefined;
  const client = mockClient([]);
  client.canvases.access = {
    set: async (params) => {
      capturedParams = params;
      return { ok: true };
    },
  };

  await setCanvasChannelAccess(client, {
    canvasId: "F123",
    channelId: "C123",
  });

  assertEquals(capturedParams, {
    canvas_id: "F123",
    access_level: "write",
    channel_ids: ["C123"],
  });
});

Deno.test("setCanvasChannelAccess supports custom access level", async () => {
  let capturedParams: Record<string, unknown> | undefined;
  const client = mockClient([]);
  client.canvases.access = {
    set: async (params) => {
      capturedParams = params;
      return { ok: true };
    },
  };

  await setCanvasChannelAccess(client, {
    canvasId: "F123",
    channelId: "C123",
    accessLevel: "read",
  });

  assertEquals(capturedParams, {
    canvas_id: "F123",
    access_level: "read",
    channel_ids: ["C123"],
  });
});

Deno.test("setCanvasChannelAccess throws when API returns error", async () => {
  const client = mockClient([]);
  client.canvases.access = {
    set: async () => ({ ok: false, error: "channel_not_found" }),
  };

  await assertRejects(
    () =>
      setCanvasChannelAccess(client, {
        canvasId: "F123",
        channelId: "C123",
      }),
    Error,
    'Failed to set channel access on canvas "F123": channel_not_found',
  );
});

Deno.test("setCanvasChannelAccess is a no-op when access.set is not defined", async () => {
  const client = mockClient([]);
  // canvases.access is undefined
  await setCanvasChannelAccess(client, {
    canvasId: "F123",
    channelId: "C123",
  });
});

Deno.test("upsertDeliveryProofSection appends delivery proof under REQ-XX and marks status Complete", () => {
  const initial = [
    "# Requirements Canvas",
    "",
    "## REQ-01: SSO Integration",
    "- **Status:** Committed",
    "- **Linked Deliverables:** `TASK-01`",
    "- **Customer Need:** Connect Entra ID",
    "",
    "### Acceptance Criteria",
    "- [x] SSO configured",
    "",
    "## Session Log",
  ].join("\n");

  const proof = [
    "### Delivery Proof & Outcome",
    "- **Customer Summary:** Entra ID successfully connected.",
    "- **Visual Proof:** [Demo Loom Video](https://loom.com/share/test1234)",
    "- **Components:** SailPoint Identity Security Cloud",
    "- **Artefacts & Config:** Connector v1.2",
  ].join("\n");

  const updated = upsertDeliveryProofSection(initial, "REQ-01", proof);
  assertEquals(updated.includes("- **Status:** Complete"), true);
  assertEquals(updated.includes("### Delivery Proof & Outcome"), true);
  assertEquals(updated.includes("[Demo Loom Video](https://loom.com/share/test1234)"), true);
});

Deno.test("upsertDeliveryProofSection updates existing delivery proof under REQ-XX", () => {
  const existing = [
    "# Requirements Canvas",
    "",
    "## REQ-01: SSO Integration",
    "- **Status:** Complete",
    "",
    "### Delivery Proof & Outcome",
    "- **Customer Summary:** Old summary.",
    "",
    "## REQ-02: User Lifecycle",
  ].join("\n");

  const proof = [
    "### Delivery Proof & Outcome",
    "- **Customer Summary:** New verified outcome.",
    "- **Visual Proof:** [Demo Video](https://loom.com/share/v2)",
  ].join("\n");

  const updated = upsertDeliveryProofSection(existing, "REQ-01", proof);
  assertEquals(updated.includes("New verified outcome"), true);
  assertEquals(updated.includes("Old summary"), false);
  assertEquals(updated.includes("## REQ-02: User Lifecycle"), true);
});

Deno.test("extractProofFromRequirementsCanvas extracts customer summary and demo loom link", () => {
  const canvas = [
    "# Requirements Canvas",
    "",
    "## REQ-01: SSO Integration",
    "- **Status:** Complete",
    "",
    "### Delivery Proof & Outcome",
    "- **Customer Summary:** SSO integration verified with Okta.",
    "- **Visual Proof:** [Demo Loom Video](https://loom.com/share/demo5678)",
    "- **Components:** ISC",
  ].join("\n");

  const extracted = extractProofFromRequirementsCanvas(canvas, "REQ-01");
  assertEquals(extracted?.customerSummary, "SSO integration verified with Okta.");
  assertEquals(extracted?.visualProofUrl, "https://loom.com/share/demo5678");
});


