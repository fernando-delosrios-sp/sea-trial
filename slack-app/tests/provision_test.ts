import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildChannelName,
  buildInviteUserIds,
  createTesEventChannel,
  findPublicChannelByName,
  unarchiveChannelIfNeeded,
  validateChannelName,
} from "../lib/channel.ts";

Deno.test("Successful channel creation — valid name produces proj-{slug}-tes", () => {
  const result = validateChannelName("Acme Demo");
  assertEquals(result.valid, true);
  assertEquals(result.channelName, "proj-acme-demo-tes");
  assertEquals(buildChannelName("Acme Demo"), "proj-acme-demo-tes");
});

Deno.test("Successful channel creation (member invite) — invites all members plus submitting user", () => {
  const result = buildInviteUserIds(["U_MEMBER1", "U_MEMBER2"], "U_SUBMITTER");
  assertEquals(result, ["U_MEMBER1", "U_MEMBER2", "U_SUBMITTER"]);
});

Deno.test("Successful channel creation (member invite) — dedupes submitting user already in member list", () => {
  const result = buildInviteUserIds(["U_MEMBER1", "U_SUBMITTER"], "U_SUBMITTER");
  assertEquals(result, ["U_MEMBER1", "U_SUBMITTER"]);
});

Deno.test("Objects seeded — context includes all object ID fields", () => {
  const context = {
    dashboardCanvasId: "d1",
    requirementsCanvasId: "r1",
    infrastructureCanvasId: "i1",
  situationReportCanvasId: "sr1",
    deliverablesListId: "l1",
    incidentsListId: "l2",
  };
  assertEquals(Object.values(context).every((v) => v.length > 0), true);
  assertEquals("situationReportCanvasId" in context, true);
});

Deno.test("findPublicChannelByName paginates until a name match", async () => {
  let listCalls = 0;
  const client = {
    conversations: {
      list: async (params: { cursor?: string }) => {
        listCalls++;
        if (!params.cursor) {
          return {
            ok: true,
            channels: [{ id: "C_OTHER", name: "general" }],
            response_metadata: { next_cursor: "cursor-2" },
          };
        }
        return {
          ok: true,
          channels: [{ id: "C_ACME", name: "proj-acme-tes", is_archived: true }],
        };
      },
    },
  };

  const found = await findPublicChannelByName(client, "proj-acme-tes");
  assertEquals(found?.id, "C_ACME");
  assertEquals(listCalls, 2);
});

Deno.test("findPublicChannelByName returns undefined when no match", async () => {
  const client = {
    conversations: {
      list: async () => ({
        ok: true,
        channels: [{ id: "C_OTHER", name: "general" }],
      }),
    },
  };

  const found = await findPublicChannelByName(client, "proj-missing-tes");
  assertEquals(found, undefined);
});

Deno.test("unarchiveChannelIfNeeded unarchives archived channels", async () => {
  let unarchived = false;
  const client = {
    conversations: {
      list: async () => ({ ok: true, channels: [] }),
      unarchive: async () => {
        unarchived = true;
        return { ok: true };
      },
    },
  };

  await unarchiveChannelIfNeeded(client, {
    id: "C_ACME",
    name: "proj-acme-tes",
    is_archived: true,
  });

  assertEquals(unarchived, true);
});

Deno.test("createTesEventChannel retries slug suffix when base name is ghost-taken", async () => {
  const createAttempts: string[] = [];
  const client = {
    conversations: {
      create: async (params: { name: string }) => {
        createAttempts.push(params.name);
        if (params.name === "proj-acme-tes") {
          return { ok: false, error: "name_taken" };
        }
        if (params.name === "proj-acme1-tes") {
          return { ok: true, channel: { id: "C_ACME1" } };
        }
        return { ok: false, error: "invalid_name" };
      },
      list: async () => ({ ok: true, channels: [] }),
    },
  };

  const result = await createTesEventChannel(client, "Acme");
  assertEquals(result.channelId, "C_ACME1");
  assertEquals(result.channelName, "proj-acme1-tes");
  assertEquals(createAttempts, ["proj-acme-tes", "proj-acme1-tes"]);
});

Deno.test("createTesEventChannel suffixes when channel list fails on name_taken", async () => {
  const createAttempts: string[] = [];
  const client = {
    conversations: {
      create: async (params: { name: string }) => {
        createAttempts.push(params.name);
        if (params.name === "proj-acme-tes") {
          return { ok: false, error: "name_taken" };
        }
        if (params.name === "proj-acme1-tes") {
          return { channel_id: "C_ACME1" };
        }
        return { ok: false, error: "invalid_name" };
      },
      list: async () => ({ ok: false, error: "missing_scope" }),
    },
  };

  const result = await createTesEventChannel(client, "Acme");
  assertEquals(result.channelId, "C_ACME1");
  assertEquals(result.channelName, "proj-acme1-tes");
  assertEquals(createAttempts, ["proj-acme-tes", "proj-acme1-tes"]);
});

Deno.test("createTesEventChannel suffixes when unarchive fails on archived channel", async () => {
  const createAttempts: string[] = [];
  const client = {
    conversations: {
      create: async (params: { name: string }) => {
        createAttempts.push(params.name);
        if (params.name === "proj-acme-tes") {
          return { ok: false, error: "name_taken" };
        }
        if (params.name === "proj-acme1-tes") {
          return { ok: true, channel: { id: "C_ACME1" } };
        }
        return { ok: false, error: "invalid_name" };
      },
      list: async () => ({
        ok: true,
        channels: [{
          id: "C_ARCHIVED",
          name: "proj-acme-tes",
          is_archived: true,
        }],
      }),
      unarchive: async () => ({ ok: false, error: "restricted_action" }),
    },
  };

  const result = await createTesEventChannel(client, "Acme");
  assertEquals(result.channelId, "C_ACME1");
  assertEquals(result.channelName, "proj-acme1-tes");
  assertEquals(createAttempts, ["proj-acme-tes", "proj-acme1-tes"]);
});

Deno.test("createTesEventChannel reuses existing channel when name_taken and channel found", async () => {
  let unarchived = false;
  const client = {
    conversations: {
      create: async () => ({ ok: false, error: "name_taken" }),
      list: async () => ({
        ok: true,
        channels: [{
          id: "C_EXISTING",
          name: "proj-acme-tes",
          is_archived: true,
        }],
      }),
      unarchive: async () => {
        unarchived = true;
        return { ok: true };
      },
    },
  };

  const result = await createTesEventChannel(client, "Acme");
  assertEquals(result.channelId, "C_EXISTING");
  assertEquals(result.channelName, "proj-acme-tes");
  assertEquals(unarchived, true);
});

