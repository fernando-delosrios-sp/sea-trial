import { assertEquals } from "std/assert/assert_equals.ts";
import {
  createDeliverablesList,
  createIncidentsList,
  type SlackListClient,
} from "../lib/lists.ts";

Deno.test("createDeliverablesList uses slackLists.create without channel_id", async () => {
  const createParams: Array<Record<string, unknown>> = [];
  const accessParams: Array<Record<string, unknown>> = [];

  const client: SlackListClient = {
    slackLists: {
      create: async (params) => {
        createParams.push({ ...params });
        return { ok: true, list_id: "F-deliverables" };
      },
      access: {
        set: async (params) => {
          accessParams.push({ ...params });
          return { ok: true };
        },
      },
      items: {
        create: async () => ({ item: { id: "item1" } }),
        list: async () => ({ items: [] }),
      },
    },
  };

  const listId = await createDeliverablesList(client, "C123");

  assertEquals(listId, "F-deliverables");
  assertEquals(createParams.length, 1);
  assertEquals("channel_id" in createParams[0], false);
  assertEquals(createParams[0].name, "Deliverables");
  assertEquals(Array.isArray(createParams[0].schema), true);
  assertEquals(accessParams, [{
    list_id: "F-deliverables",
    access_level: "write",
    channel_ids: ["C123"],
  }]);
});

Deno.test("createIncidentsList grants channel write access after create", async () => {
  const accessParams: Array<Record<string, unknown>> = [];

  const client: SlackListClient = {
    slackLists: {
      create: async () => ({ ok: true, list_id: "F-incidents" }),
      access: {
        set: async (params) => {
          accessParams.push({ ...params });
          return { ok: true };
        },
      },
      items: {
        create: async () => ({ item: { id: "item1" } }),
        list: async () => ({ items: [] }),
      },
    },
  };

  const listId = await createIncidentsList(client, "C456");
  assertEquals(listId, "F-incidents");
  assertEquals(accessParams[0]?.channel_ids, ["C456"]);
});
