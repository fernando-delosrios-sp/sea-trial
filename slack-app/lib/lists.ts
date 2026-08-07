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

export interface SlackListClient {
  slackLists: {
    create: (params: {
      channel_id: string;
      name: string;
      schema: Array<{ name: string; type: string }>;
    }) => Promise<SlackListCreateResponse>;
    items: {
      create: (params: {
        list_id: string;
        initial_fields: Array<{ column_id: string; value: string }>;
      }) => Promise<{ item?: { id: string } }>;
    };
  };
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
