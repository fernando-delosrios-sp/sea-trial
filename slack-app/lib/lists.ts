import {
  getListName,
  getSlackListSchema,
} from "./content/list-compiler.ts";

export interface SlackListCreateResponse {
  ok?: boolean;
  error?: string;
  list_id?: string;
  list?: { id?: string };
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
      schema: Array<{
        key: string;
        name: string;
        type: string;
        options?: Record<string, unknown>;
      }>;
    }) => Promise<SlackListCreateResponse>;
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
    return {
      taskId: byColumn.get("task_id") ?? "",
      status: byColumn.get("status") ?? "Not started",
      situation: byColumn.get("situation") ?? "",
      category: byColumn.get("category") ?? "Uncategorized",
      deliverableUrl: byColumn.get("deliverable") || undefined,
      openQuestions: byColumn.get("open_questions") || undefined,
    };
  }).filter((row) => row.taskId.length > 0);
}

/**
 * Creates the Deliverables list with core schema columns from declarative JSON.
 */
export async function createDeliverablesList(
  client: SlackListClient,
  channelId: string,
): Promise<string> {
  const response = await client.slackLists.create({
    channel_id: channelId,
    name: getListName("deliverables"),
    schema: getSlackListSchema("deliverables"),
  });

  const listId = response.list_id ?? response.list?.id;
  if (!listId) {
    const detail = response.error ? `: ${response.error}` : "";
    throw new Error(`Failed to create Deliverables list${detail}`);
  }
  return listId;
}

/**
 * Creates the Incidents list with core schema columns from declarative JSON.
 */
export async function createIncidentsList(
  client: SlackListClient,
  channelId: string,
): Promise<string> {
  const response = await client.slackLists.create({
    channel_id: channelId,
    name: getListName("incidents"),
    schema: getSlackListSchema("incidents"),
  });

  const listId = response.list_id ?? response.list?.id;
  if (!listId) {
    const detail = response.error ? `: ${response.error}` : "";
    throw new Error(`Failed to create Incidents list${detail}`);
  }
  return listId;
}

