import { assertEquals, assertRejects } from "std/assert/mod.ts";
import {
  attachListToChannel,
  createDeliverablesList,
  createIncidentsList,
  type SlackListClient,
} from "../lib/lists.ts";

function buildListClient(overrides: {
  create?: SlackListClient["slackLists"]["create"];
  accessSet?: SlackListClient["slackLists"]["access"]["set"];
  itemsCreate?: SlackListClient["slackLists"]["items"]["create"];
  apiCall?: SlackListClient["apiCall"];
  bookmarksAdd?: NonNullable<SlackListClient["bookmarks"]>["add"];
}): {
  client: SlackListClient;
  createParams: Array<Record<string, unknown>>;
  accessParams: Array<Record<string, unknown>>;
  itemCreateParams: Array<Record<string, unknown>>;
  apiCallParams: Array<{ method: string; params: Record<string, unknown> }>;
  bookmarkParams: Array<Record<string, unknown>>;
} {
  const createParams: Array<Record<string, unknown>> = [];
  const accessParams: Array<Record<string, unknown>> = [];
  const itemCreateParams: Array<Record<string, unknown>> = [];
  const apiCallParams: Array<{ method: string; params: Record<string, unknown> }> = [];
  const bookmarkParams: Array<Record<string, unknown>> = [];

  const client: SlackListClient = {
    apiCall: overrides.apiCall ?? (async (method, params) => {
      apiCallParams.push({ method, params });
      if (method === "conversations.lists.create" && "list_id" in params) {
        return { ok: true };
      }
      return { error: "unknown_method" };
    }),
    slackLists: {
      create: overrides.create ?? (async (params) => {
        createParams.push({ ...params });
        return { ok: true, list_id: "F-deliverables" };
      }),
      access: {
        set: overrides.accessSet ?? (async (params) => {
          accessParams.push({ ...params });
          return { ok: true };
        }),
      },
      items: {
        create: overrides.itemsCreate ?? (async (params) => {
          itemCreateParams.push({ ...params });
          return { item: { id: "item1" } };
        }),
        list: async () => ({ items: [] }),
      },
    },
    bookmarks: {
      add: overrides.bookmarksAdd ?? (async (params) => {
        bookmarkParams.push({ ...params });
        return { ok: true };
      }),
    },
  };

  return {
    client,
    createParams,
    accessParams,
    itemCreateParams,
    apiCallParams,
    bookmarkParams,
  };
}

Deno.test("createDeliverablesList attaches list as channel tab via apiCall", async () => {
  const {
    client,
    createParams,
    accessParams,
    itemCreateParams,
    apiCallParams,
    bookmarkParams,
  } = buildListClient({});

  const listId = await createDeliverablesList(client, "C123", {
    attachToChannel: true,
    teamId: "T01234567",
    accountName: "Acme Corp",
  });

  assertEquals(listId, "F-deliverables");
  assertEquals(createParams.length, 1);
  assertEquals(createParams[0].name, "Acme Corp Deliverables");
  assertEquals(Array.isArray(createParams[0].schema), true);
  assertEquals("channel_id" in createParams[0], false);
  assertEquals(accessParams, [{
    list_id: "F-deliverables",
    access_level: "write",
    channel_ids: ["C123"],
  }]);
  assertEquals(
    apiCallParams.some((call) =>
      call.method === "conversations.lists.create" &&
      call.params.channel_id === "C123" &&
      call.params.list_id === "F-deliverables"
    ),
    true,
  );
  assertEquals(bookmarkParams.length, 0);
  assertEquals(itemCreateParams.length, 1);
  assertEquals(itemCreateParams[0]?.list_id, "F-deliverables");
});

Deno.test("createDeliverablesList falls back to bookmark when tab API unavailable", async () => {
  const { client, bookmarkParams } = buildListClient({
    apiCall: async () => ({ error: "unknown_method" }),
  });

  await createDeliverablesList(client, "C123", {
    attachToChannel: true,
    teamId: "T01234567",
    accountName: "Acme Corp",
  });

  assertEquals(bookmarkParams, [{
    channel_id: "C123",
    title: "Acme Corp Deliverables",
    type: "link",
    link: "https://app.slack.com/lists/T01234567/F-deliverables",
  }]);
});

Deno.test("createIncidentsList attaches list as channel tab via apiCall", async () => {
  const apiCallParams: Array<{ method: string; params: Record<string, unknown> }> = [];

  const client: SlackListClient = {
    apiCall: async (method, params) => {
      apiCallParams.push({ method, params });
      if (method === "conversations.lists.create" && "list_id" in params) {
        return { ok: true };
      }
      return { error: "unknown_method" };
    },
    slackLists: {
      create: async () => ({ ok: true, list_id: "F-incidents" }),
      access: {
        set: async () => ({ ok: true }),
      },
      items: {
        create: async () => ({ item: { id: "item1" } }),
        list: async () => ({ items: [] }),
      },
    },
    bookmarks: {
      add: async () => ({ ok: true }),
    },
  };

  const listId = await createIncidentsList(client, "C456", {
    attachToChannel: true,
    teamId: "T01234567",
  });
  assertEquals(listId, "F-incidents");
  assertEquals(
    apiCallParams.some((call) =>
      call.method === "conversations.lists.create" &&
      call.params.list_id === "F-incidents"
    ),
    true,
  );
});

Deno.test("createDeliverablesList uses inline tab create when supported", async () => {
  const { client, createParams, apiCallParams, bookmarkParams } = buildListClient({
    apiCall: async (method, params) => {
      apiCallParams.push({ method, params });
      if (method === "conversations.lists.create" && "name" in params) {
        return { ok: true, list_id: "F-tabbed" };
      }
      return { error: "unknown_method" };
    },
  });

  const listId = await createDeliverablesList(client, "C123", {
    attachToChannel: true,
    teamId: "T01234567",
  });

  assertEquals(listId, "F-tabbed");
  assertEquals(createParams.length, 0);
  assertEquals(apiCallParams[0]?.method, "conversations.lists.create");
  assertEquals(apiCallParams[0]?.params.channel_id, "C123");
  assertEquals(bookmarkParams.length, 0);
});

Deno.test("createDeliverablesList slugifies select values in seed rows", async () => {
  const itemCreateParams: Array<Record<string, unknown>> = [];

  const { client } = buildListClient({
    itemsCreate: async (params) => {
      itemCreateParams.push({ ...params });
      return { item: { id: "item1" } };
    },
  });

  await createDeliverablesList(client, "C123", {
    attachToChannel: true,
    teamId: "T01234567",
  });

  const initialFields = itemCreateParams[0]?.initial_fields as Array<{
    column_id: string;
    value: string;
  }>;
  const statusField = initialFields.find((field) => field.column_id === "status");
  assertEquals(statusField?.value, "not_started");
});

Deno.test("createDeliverablesList skips attach when attachToChannel is false", async () => {
  const { client, createParams, apiCallParams, bookmarkParams } = buildListClient({});

  await createDeliverablesList(client, "C123", { attachToChannel: false });

  assertEquals(createParams.length, 1);
  assertEquals(apiCallParams.length, 0);
  assertEquals(bookmarkParams.length, 0);
});

Deno.test("attachListToChannel adds bookmark without tab API probe", async () => {
  const bookmarkParams: Array<Record<string, unknown>> = [];

  await attachListToChannel(
    {
      bookmarks: {
        add: async (params) => {
          bookmarkParams.push({ ...params });
          return { ok: true };
        },
      },
    },
    "C123",
    "F-deliverables",
    { listTitle: "Acme Corp Deliverables", teamId: "T01234567" },
  );

  assertEquals(bookmarkParams, [{
    channel_id: "C123",
    title: "Acme Corp Deliverables",
    type: "link",
    link: "https://app.slack.com/lists/T01234567/F-deliverables",
  }]);
});

Deno.test("attachListToChannel fails when bookmark add returns error", async () => {
  await assertRejects(
    () =>
      attachListToChannel(
        {
          bookmarks: {
            add: async () => ({ ok: false, error: "missing_scope" }),
          },
        },
        "C123",
        "F-list",
        { listTitle: "Deliverables", teamId: "T01234567" },
      ),
    Error,
    "Failed to attach Deliverables list to channel: missing_scope",
  );
});

Deno.test("createDeliverablesList requires teamId when tab attach unavailable", async () => {
  const { client } = buildListClient({
    apiCall: async () => ({ error: "unknown_method" }),
  });

  await assertRejects(
    () => createDeliverablesList(client, "C123", { attachToChannel: true }),
    Error,
    "SLACK_TEAM_ID is required to attach lists to the channel",
  );
});
