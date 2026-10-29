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

export interface SlackCanvasAccessResponse {
  ok?: boolean;
  error?: string;
}

export interface SlackCanvasClient {
  canvases: {
    create: (params: {
      channel_id?: string;
      title: string;
      document_content: { type: string; markdown: string };
    }) => Promise<SlackCanvasCreateResponse>;
    access?: {
      set: (params: {
        canvas_id: string;
        access_level: "read" | "write";
        channel_ids?: string[];
        user_ids?: string[];
      }) => Promise<SlackCanvasAccessResponse>;
    };
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
      }) => Promise<CanvasSectionsLookupResponse>;
    };
  };
}

export interface CanvasSectionsLookupResponse {
  ok?: boolean;
  error?: string;
  sections?: Array<{ id: string; markdown?: string }>;
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
      }) => Promise<CanvasSectionsLookupResponse>;
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

export interface SetCanvasChannelAccessParams {
  canvasId: string;
  channelId: string;
  accessLevel?: "read" | "write";
}

/**
 * Grants channel-scoped access to a Slack canvas.
 * When client.canvases.access.set is available, sets access for the channel.
 * @param client - Slack API client with canvas scopes
 * @param params - Canvas ID, Channel ID, and optional access level (defaults to "write")
 */
export async function setCanvasChannelAccess(
  client: SlackCanvasClient,
  params: SetCanvasChannelAccessParams,
): Promise<void> {
  if (!client.canvases.access?.set) {
    return;
  }

  const accessLevel = params.accessLevel ?? "write";
  const response = await client.canvases.access.set({
    canvas_id: params.canvasId,
    access_level: accessLevel,
    channel_ids: [params.channelId],
  });

  if (response.error || response.ok === false) {
    const detail = response.error ? `: ${response.error}` : "";
    throw new Error(
      `Failed to set channel access on canvas "${params.canvasId}"${detail}`,
    );
  }
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
 * Reads canvas markdown by concatenating header sections.
 */
export async function readCanvasMarkdown(
  client: CanvasSectionsClient,
  canvasId: string,
): Promise<string> {
  const headerLookup = await client.canvases.sections.lookup({
    canvas_id: canvasId,
    criteria: { section_types: ["any_header", "h1", "h2", "h3"] },
  });

  const seen = new Set<string>();
  const parts: string[] = [];

  for (const section of headerLookup.sections ?? []) {
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Appends or updates the `### Delivery Proof & Outcome` section under a targeted `REQ-XX` heading
 * and updates the requirement status to `Complete`.
 */
export function upsertDeliveryProofSection(
  canvasMarkdown: string,
  requirementRef: string,
  proofBlockMarkdown: string,
  options: { markComplete?: boolean } = {},
): string {
  const markComplete = options.markComplete ?? true;
  const cleanRef = requirementRef.trim();

  // Pattern to find the requirement heading: e.g. "## REQ-01:" or "## REQ-01"
  const reqPattern = new RegExp(
    `(^|\\n)(##\\s*${escapeRegex(cleanRef)}[:\\s][^\\n]*\\n)([\\s\\S]*?)(?=\\n## |$)`,
  );
  const match = canvasMarkdown.match(reqPattern);

  if (!match) {
    return canvasMarkdown;
  }

  const prefix = match[1];
  const headingLine = match[2];
  let reqBody = match[3];

  if (markComplete) {
    if (/- \*\*Status:\*\*/.test(reqBody)) {
      reqBody = reqBody.replace(
        /- \*\*Status:\*\*[^\n]*/,
        "- **Status:** Complete",
      );
    }
  }

  // Check if ### Delivery Proof & Outcome already exists
  const proofPattern = /(### Delivery Proof & Outcome[\s\S]*?)(?=\n### |\n## |$)/;
  if (proofPattern.test(reqBody)) {
    reqBody = reqBody.replace(proofPattern, proofBlockMarkdown.trim());
  } else {
    reqBody = `${reqBody.trimEnd()}\n\n${proofBlockMarkdown.trim()}\n`;
  }

  const updatedReqSection = `${prefix}${headingLine}${reqBody}`;
  return canvasMarkdown.replace(match[0], updatedReqSection);
}

/**
 * Extracts delivery proof details from the Requirements Canvas markdown for a given requirement.
 */
export function extractProofFromRequirementsCanvas(
  canvasMarkdown?: string,
  requirementRef?: string,
): { customerSummary?: string; visualProofUrl?: string; visualProofMarkdown?: string } | null {
  if (!canvasMarkdown) return null;
  let targetSection = canvasMarkdown;
  if (requirementRef) {
    const reqPattern = new RegExp(
      `(^|\\n)##\\s*${escapeRegex(requirementRef)}[:\\s][\\s\\S]*?(?=\\n## |$)`,
    );
    const match = canvasMarkdown.match(reqPattern);
    if (match) {
      targetSection = match[0];
    }
  }
  const proofMatch = targetSection.match(
    /### Delivery Proof & Outcome[\s\S]*?(?=\n## |\n### |$)/,
  );
  if (!proofMatch) return null;
  const proofText = proofMatch[0];
  const summaryMatch = proofText.match(/- \*\*Customer Summary:\*\*\s*(.+)/);
  const visualMatch = proofText.match(/- \*\*Visual Proof:\*\*\s*(.+)/);
  const customerSummary = summaryMatch?.[1]?.trim();
  const visualProofMarkdown = visualMatch?.[1]?.trim();
  const urlMatch = visualProofMarkdown?.match(/https?:\/\/[^\s)>]+/);
  return {
    customerSummary,
    visualProofUrl: urlMatch?.[0],
    visualProofMarkdown,
  };
}



