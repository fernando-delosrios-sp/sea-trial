import {
  getListName,
  getListSeedItems,
  getSlackListSchema,
} from "./content/list-compiler.ts";
import {
  fromSlackListSelectValue,
  toSlackListSelectValue,
} from "./content/slack-list-schema.ts";
import { getDeliverableStatusChoices } from "./content/domain.ts";

export interface SlackListCreateResponse {
  ok?: boolean;
  error?: string;
  list_id?: string;
  list?: { id?: string };
}

export interface SlackListAccessResponse {
  ok?: boolean;
  error?: string;
}

export interface SlackListSchemaColumn {
  key: string;
  name: string;
  type: string;
  is_primary_column?: boolean;
  options?: Record<string, unknown>;
}

export interface SlackListReadClient {
  slackLists: {
    items: {
      list: (params: {
        list_id: string;
        limit?: number;
      }) => Promise<SlackListItemsResponse>;
    };
  };
}

export interface SlackListClient extends SlackListReadClient {
  slackLists: SlackListReadClient["slackLists"] & {
    create: (params: {
      channel_id: string;
      name: string;
      schema: SlackListSchemaColumn[];
    }) => Promise<SlackListCreateResponse>;
    access: {
      set: (params: {
        list_id: string;
        access_level: "read" | "write" | "owner";
        channel_ids: string[];
      }) => Promise<SlackListAccessResponse>;
    };
    items: {
      create: (params: {
        list_id: string;
        initial_fields: Array<{ column_id: string; value: string }>;
      }) => Promise<{ item?: { id: string } }>;
      list: (params: {
        list_id: string;
        limit?: number;
      }) => Promise<SlackListItemsResponse>;
    };
  };
}

export interface SlackListItemField {
  column_id: string;
  value?: string;
  text?: string;
  link?: { url?: string };
  select?: string[];
}

export interface SlackListItemsResponse {
  ok?: boolean;
  error?: string;
  items?: Array<{ fields?: SlackListItemField[] }>;
}

export interface DeliverablesListRow {
  taskId: string;
  status: string;
  situation: string;
  category: string;
  deliverableUrl?: string;
  openQuestions?: string;
}

function fieldValue(field: SlackListItemField): string {
  if (field.value?.trim()) return field.value.trim();
  if (field.text?.trim()) return field.text.trim();
  if (field.link?.url?.trim()) return field.link.url.trim();
  if (field.select?.[0]?.trim()) return field.select[0].trim();
  return "";
}

function formatListCreateFailure(
  listName: string,
  response: SlackListCreateResponse,
  schema: SlackListSchemaColumn[],
): string {
  const detail = response.error ? `: ${response.error}` : "";
  const statusColumn = schema.find((column) => column.key === "status");
  const choiceCount = Array.isArray(statusColumn?.options?.choices)
    ? statusColumn.options.choices.length
    : 0;
  return (
    `Failed to create ${listName} list${detail} ` +
    `(columns=${schema.length}, statusChoices=${choiceCount}, ` +
    `keys=${schema.map((column) => column.key).join(",")})`
  );
}

const LIST_SEED_ROW_PREFIX = "__seed__";

function isSeedListRow(primaryValue: string): boolean {
  return primaryValue.startsWith(LIST_SEED_ROW_PREFIX);
}

async function seedListItems(
  client: SlackListClient,
  listId: string,
  listName: string,
  items: Array<Record<string, string>>,
): Promise<void> {
  for (const item of items) {
    const initial_fields = Object.entries(item).map(([column_id, value]) => ({
      column_id,
      value,
    }));

    await client.slackLists.items.create({
      list_id: listId,
      initial_fields,
    });
  }
}

async function createListInChannel(
  client: SlackListClient,
  channelId: string,
  listRef: string,
): Promise<string> {
  const listName = getListName(listRef);
  const schema = getSlackListSchema(listRef);
  const response = await client.slackLists.create({
    channel_id: channelId,
    name: listName,
    schema,
  });

  const listId = response.list_id ?? response.list?.id;
  if (!listId) {
    console.error(formatListCreateFailure(listName, response, schema));
    throw new Error(formatListCreateFailure(listName, response, schema));
  }

  const accessResponse = await client.slackLists.access.set({
    list_id: listId,
    access_level: "write",
    channel_ids: [channelId],
  });

  if (accessResponse.error || accessResponse.ok === false) {
    const detail = accessResponse.error ? `: ${accessResponse.error}` : "";
    throw new Error(`Failed to grant ${listName} list access to channel${detail}`);
  }

  const seedItems = getListSeedItems(listRef);
  if (seedItems.length > 0) {
    await seedListItems(client, listId, listName, seedItems);
  }

  return listId;
}

/** Reads deliverable rows from a Slack List by column key. */
export async function fetchDeliverablesListRows(
  client: SlackListReadClient,
  listId: string,
): Promise<DeliverablesListRow[]> {
  const response = await client.slackLists.items.list({
    list_id: listId,
    limit: 200,
  });

  if (response.error) {
    throw new Error(`Failed to read Deliverables list: ${response.error}`);
  }

  return (response.items ?? []).map((item) => {
    const byColumn = new Map<string, string>();
    for (const field of item.fields ?? []) {
      byColumn.set(field.column_id, fieldValue(field));
    }
    const statusLabels = getDeliverableStatusChoices().map((choice) => choice.value);
    const rawStatus = byColumn.get("status") ?? "Not started";
    return {
      taskId: byColumn.get("task_id") ?? "",
      status: fromSlackListSelectValue(rawStatus, statusLabels),
      situation: byColumn.get("situation") ?? "",
      category: byColumn.get("category") ?? "Uncategorized",
      deliverableUrl: byColumn.get("deliverable") || undefined,
      openQuestions: byColumn.get("open_questions") || undefined,
    };
  }).filter((row) =>
    row.taskId.length > 0 && !isSeedListRow(row.taskId)
  );
}

/**
 * Creates the Deliverables list with core schema columns from declarative JSON.
 */
export async function createDeliverablesList(
  client: SlackListClient,
  channelId: string,
): Promise<string> {
  return await createListInChannel(client, channelId, "deliverables");
}

/**
 * Creates the Incidents list with core schema columns from declarative JSON.
 */
export async function createIncidentsList(
  client: SlackListClient,
  channelId: string,
): Promise<string> {
  return await createListInChannel(client, channelId, "incidents");
}
