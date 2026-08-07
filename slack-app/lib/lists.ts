export const DELIVERABLES_COLUMNS = [
  { name: "Task ID", type: "text" },
  { name: "Assignee", type: "user" },
  { name: "Status", type: "select" },
  { name: "Situation", type: "text" },
  { name: "Category", type: "text" },
  { name: "Requirements", type: "text" },
  { name: "Due date", type: "date" },
  { name: "Deliverable", type: "link" },
] as const;

export const INCIDENTS_COLUMNS = [
  { name: "Title", type: "text" },
  { name: "Status", type: "select" },
  { name: "Reporter", type: "user" },
  { name: "Description", type: "text" },
] as const;

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
 * Creates the Deliverables list with core schema columns.
 */
export async function createDeliverablesList(
  client: SlackListClient,
  channelId: string,
): Promise<string> {
  const response = await client.slackLists.create({
    channel_id: channelId,
    name: "Deliverables",
    schema: DELIVERABLES_COLUMNS.map((c) => ({
      name: c.name,
      type: c.type,
    })),
  });

  const listId = response.list_id ?? response.list?.id;
  if (!listId) {
    const detail = response.error ? `: ${response.error}` : "";
    throw new Error(`Failed to create Deliverables list${detail}`);
  }
  return listId;
}

/**
 * Creates the Incidents list with core schema columns.
 */
export async function createIncidentsList(
  client: SlackListClient,
  channelId: string,
): Promise<string> {
  const response = await client.slackLists.create({
    channel_id: channelId,
    name: "Incidents",
    schema: INCIDENTS_COLUMNS.map((c) => ({
      name: c.name,
      type: c.type,
    })),
  });

  const listId = response.list_id ?? response.list?.id;
  if (!listId) {
    const detail = response.error ? `: ${response.error}` : "";
    throw new Error(`Failed to create Incidents list${detail}`);
  }
  return listId;
}

