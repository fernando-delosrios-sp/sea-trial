export interface CreateCanvasParams {
  channelId?: string;
  title: string;
  content: string;
}

export interface UpdateCanvasSectionParams {
  canvasId: string;
  sectionMarker: string;
  newContent: string;
}

import { METADATA_MARKER } from "./event-context.ts";
import {
  allocateUniqueName,
  isNameCollisionError,
  NameCollisionError,
} from "./unique-resource-name.ts";

export interface SlackCanvasCreateResponse {
  ok?: boolean;
  error?: string;
  canvas_id?: string;
  canvas?: { id?: string };
}

export interface SlackCanvasClient {
  canvases: {
    create: (params: {
      channel_id?: string;
      title: string;
      document_content: { type: string; markdown: string };
    }) => Promise<SlackCanvasCreateResponse>;
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
        criteria: {
          section_types?: string[];
          contains_text?: string;
        };
      }) => Promise<{ sections?: Array<{ id: string; markdown?: string }> }>;
    };
  };
}

/** Minimal client surface for replacing full canvas markdown. */
export interface CanvasEditClient {
  canvases: {
    edit: (params: {
      canvas_id: string;
      changes: Array<{
        operation: string;
        document_content?: { type: string; markdown: string };
      }>;
    }) => Promise<unknown>;
  };
}
/** Minimal client surface for reading canvas markdown (sections.lookup only). */
export interface CanvasSectionsClient {
  canvases: {
    sections: {
      lookup: (params: {
        canvas_id: string;
        criteria: {
          section_types?: string[];
          contains_text?: string;
        };
      }) => Promise<{ sections?: Array<{ id: string; markdown?: string }> }>;
    };
  };
}

/**
 * Creates a new Slack canvas in a channel.
 * When the title already exists workspace-wide, retries with `1`, `2`, … suffixes (no separator).
 * @param client - Slack API client with canvas scopes
 * @param params - Channel ID, title, and markdown content
 * @returns Created canvas ID
 */
export async function createCanvas(
  client: SlackCanvasClient,
  params: CreateCanvasParams,
): Promise<string> {
  const { result: canvasId } = await allocateUniqueName(
    params.title,
    async (title) => {
      const response = await client.canvases.create({
        ...(params.channelId ? { channel_id: params.channelId } : {}),
        title,
        document_content: { type: "markdown", markdown: params.content },
      });

      const id = response.canvas_id ?? response.canvas?.id;
      if (!id) {
        if (isNameCollisionError(response.error)) {
          throw new NameCollisionError(response.error!);
        }
        const detail = response.error ? `: ${response.error}` : "";
        throw new Error(`Failed to create canvas "${title}"${detail}`);
      }
      return id;
    },
  );

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
  client: CanvasEditClient,
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

/**
 * Reads canvas markdown by concatenating header sections and any section
 * containing the TesEventContext metadata marker (which may live outside headers).
 */
export async function readCanvasMarkdown(
  client: CanvasSectionsClient,
  canvasId: string,
): Promise<string> {
  const [headerLookup, metadataLookup] = await Promise.all([
    client.canvases.sections.lookup({
      canvas_id: canvasId,
      criteria: { section_types: ["any_header", "h1", "h2", "h3"] },
    }),
    client.canvases.sections.lookup({
      canvas_id: canvasId,
      criteria: { contains_text: METADATA_MARKER },
    }),
  ]);

  const seen = new Set<string>();
  const parts: string[] = [];

  for (const section of [
    ...(headerLookup.sections ?? []),
    ...(metadataLookup.sections ?? []),
  ]) {
    if (section.id && seen.has(section.id)) continue;
    if (section.id) seen.add(section.id);
    if (section.markdown) parts.push(section.markdown);
  }

  const content = parts.join("\n");
  if (!content) {
    throw new Error(`Canvas ${canvasId} has no readable sections`);
  }

  return content;
}



