export interface CreateCanvasParams {
  channelId: string;
  title: string;
  content: string;
}

export interface UpdateCanvasSectionParams {
  canvasId: string;
  sectionMarker: string;
  newContent: string;
}

export interface SlackCanvasClient {
  canvases: {
    create: (params: {
      channel_id: string;
      title: string;
      document_content: { type: string; markdown: string };
    }) => Promise<{ canvas?: { id: string } }>;
    edit: (params: {
      canvas_id: string;
      changes: Array<{
        operation: string;
        section_id?: string;
        document_content?: { type: string; markdown: string };
      }>;
    }) => Promise<unknown>;
    sections: {
      lookup: (params: {
        canvas_id: string;
        criteria: { section_types: string[] };
      }) => Promise<{ sections?: Array<{ id: string; markdown?: string }> }>;
    };
  };
}

/**
 * Creates a new Slack canvas in a channel.
 * @param client - Slack API client with canvas scopes
 * @param params - Channel ID, title, and markdown content
 * @returns Created canvas ID
 */
export async function createCanvas(
  client: SlackCanvasClient,
  params: CreateCanvasParams,
): Promise<string> {
  const response = await client.canvases.create({
    channel_id: params.channelId,
    title: params.title,
    document_content: { type: "markdown", markdown: params.content },
  });

  const canvasId = response.canvas?.id;
  if (!canvasId) {
    throw new Error(`Failed to create canvas "${params.title}"`);
  }
  return canvasId;
}

/**
 * Updates a section of an existing canvas identified by a marker string in its markdown.
 * @param client - Slack API client with canvas scopes
 * @param params - Canvas ID, section marker, and new markdown content
 */
export async function updateCanvasSection(
  client: SlackCanvasClient,
  params: UpdateCanvasSectionParams,
): Promise<void> {
  const lookup = await client.canvases.sections.lookup({
    canvas_id: params.canvasId,
    criteria: { section_types: ["any_header"] },
  });

  const section = lookup.sections?.find((s) =>
    s.markdown?.includes(params.sectionMarker)
  );

  if (!section?.id) {
    throw new Error(
      `Section with marker "${params.sectionMarker}" not found in canvas ${params.canvasId}`,
    );
  }

  await client.canvases.edit({
    canvas_id: params.canvasId,
    changes: [{
      operation: "replace",
      section_id: section.id,
      document_content: {
        type: "markdown",
        markdown: params.newContent,
      },
    }],
  });
}

/**
 * Replaces the entire canvas content (used for Requirements canvas updates).
 */
export async function replaceCanvasContent(
  client: SlackCanvasClient,
  canvasId: string,
  content: string,
): Promise<void> {
  await client.canvases.edit({
    canvas_id: canvasId,
    changes: [{
      operation: "replace",
      document_content: { type: "markdown", markdown: content },
    }],
  });
}
