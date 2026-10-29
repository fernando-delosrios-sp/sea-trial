import type {
  DocumentInput,
  ProcessRequirementsRequest,
  ProcessRequirementsResponse,
  TesEventContext,
} from "@sea-trial/shared/types/index.ts";
import {
  buildInvokeAgentRequest,
  buildProposalBlocks,
  callRequirementsAgent,
  onboardingGateMessage,
  resolveAgentServiceUrl,
} from "./agent-client.ts";
import { deserializeEventContext } from "./event-context.ts";
import { shouldProceedWithAgent } from "./agent-gate.ts";
import {
  readCanvasMarkdown,
  replaceCanvasContent,
  type CanvasSectionsClient,
  type SlackCanvasClient,
} from "./canvas.ts";
import {
  getTesEventContext,
  type TesEventContextStoreClient,
} from "./tes-event-context-store.ts";
import type { AppLogger } from "./logger.ts";

export interface InvokeAgentInputs {
  channel_id: string;
  user_id: string;
  message_ts: string;
  thread_ts?: string;
  text?: string;
  dashboard_canvas_content?: string;
  requirements_canvas_content?: string;
  file_ids?: string[];
}

export interface InvokeAgentClient {
  token: string;
  files: {
    info: (args: { file: string }) => Promise<{
      ok: boolean;
      file?: {
        url_private_download?: string;
        name?: string;
        mimetype?: string;
      };
    }>;
  };
  chat: {
    postMessage: (args: Record<string, unknown>) => Promise<{ ts?: string }>;
  };
  conversations?: {
    replies?: (params: { channel: string; ts: string }) => Promise<{
      ok?: boolean;
      messages?: Array<{ ts?: string; files?: Array<{ id?: string }> }>;
    }>;
  };
  apps?: {
    datastore?: {
      get: (params: {
        datastore: string;
        id: string;
      }) => Promise<{
        ok?: boolean;
        error?: string;
        item?: { channel_id?: string; snapshot?: string };
      }>;
    };
  };
  canvases?: {
    edit?: (params: unknown) => Promise<unknown>;
    sections?: {
      lookup: (params: unknown) => Promise<{
        ok?: boolean;
        sections?: Array<{ id: string; markdown?: string }>;
      }>;
    };
  };
}

export interface InvokeAgentDeps {
  fetchFile?: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
  callAgent?: (
    agentServiceUrl: string,
    request: ProcessRequirementsRequest,
    correlationId?: string,
  ) => Promise<ProcessRequirementsResponse>;
  replaceCanvas?: (
    client: InvokeAgentClient,
    canvasId: string,
    content: string,
  ) => Promise<void>;
}

export type InvokeAgentResult =
  | { outputs: { thread_ts: string } }
  | { error: string };

export type AgentRoute =
  | { type: "requirements"; threadTs: string }
  | { type: "delivery"; threadTs: string }
  | { type: "help"; threadTs: string }
  | { type: "redirect_materials"; threadTs: string }
  | { type: "ignore" };

/**
 * Resolves the destination agent or help action from message context.
 */
export function resolveAgentInvocationRoute(params: {
  text?: string;
  messageTs: string;
  threadTs?: string;
  materialsDropMessageTs?: string;
  hasFiles?: boolean;
}): AgentRoute {
  const activeThreadTs = params.threadTs ?? params.messageTs;

  // 1. Materials Drop thread reply
  if (
    params.materialsDropMessageTs &&
    (params.threadTs === params.materialsDropMessageTs ||
      params.messageTs === params.materialsDropMessageTs)
  ) {
    return { type: "requirements", threadTs: params.materialsDropMessageTs };
  }

  // 2. Mention of bot in text
  if (params.text) {
    const mentionMatch = params.text.match(/<@[A-Z0-9]+>|@Sea Trial/i);
    if (mentionMatch) {
      const afterMention = params.text
        .slice(mentionMatch.index! + mentionMatch[0].length)
        .trim();
      const subCommand = afterMention.split(/\s+/)[0]?.toLowerCase();

      if (subCommand === "requirements" || subCommand === "req") {
        return { type: "requirements", threadTs: activeThreadTs };
      }
      if (subCommand === "delivery") {
        return { type: "delivery", threadTs: activeThreadTs };
      }
      return { type: "help", threadTs: activeThreadTs };
    }
  }

  // 3. File uploaded in general chatter outside the Materials Drop thread
  if (params.hasFiles) {
    return { type: "redirect_materials", threadTs: activeThreadTs };
  }

  return { type: "ignore" };
}

/**
 * Guidance message when a document is uploaded in general channel chatter.
 */
export function materialsRedirectMessage(): string {
  return "Please upload specification and requirements documents to the pinned *📁 Materials & Requirements Drop* thread so the Requirements Agent can process them.";
}

/**
 * Returns help text when @Sea Trial is mentioned without a recognized sub-command.
 */
export function agentUsageHelpMessage(): string {
  return "Available Sea Trial agents:\n• `@Sea Trial requirements [instructions]` — Extract & propose requirements deliverables\n• `@Sea Trial delivery [instructions]` — Delivery template consolidation\n\nOr attach requirements documents directly to the pinned *📁 Materials & Requirements Drop* thread.";
}

export async function runInvokeAgentHandler(
  inputs: InvokeAgentInputs,
  client: InvokeAgentClient,
  env: Record<string, string | undefined>,
  logger: AppLogger,
  deps: InvokeAgentDeps = {},
): Promise<InvokeAgentResult> {
  const startedAt = Date.now();
  const fetchFile = deps.fetchFile ?? fetch;
  const callAgent = deps.callAgent ?? callRequirementsAgent;
  const replaceCanvas = deps.replaceCanvas ?? (async (slackClient, canvasId, content) => {
    await replaceCanvasContent(
      slackClient as unknown as SlackCanvasClient,
      canvasId,
      content,
    );
  });

  const activeThreadTs = inputs.thread_ts ?? inputs.message_ts;

  let context: TesEventContext | null = null;
  if (inputs.dashboard_canvas_content) {
    context = deserializeEventContext(inputs.dashboard_canvas_content);
    if (!context) {
      throw new Error("Invalid dashboard canvas context");
    }
  } else if (client.apps?.datastore) {
    context = await getTesEventContext(
      client as unknown as TesEventContextStoreClient,
      inputs.channel_id,
    );
  }

  if (!context) {
    if (inputs.dashboard_canvas_content) {
      throw new Error("Invalid dashboard canvas context");
    }
    // Channel is not a TES Event Channel; exit quietly without error
    return { outputs: { thread_ts: activeThreadTs } };
  }

  // Evaluate invocation route (Materials Drop, @mention sub-command, or chatter fast-exit)
  const hasFiles = Boolean(inputs.file_ids && inputs.file_ids.length > 0);
  const route = resolveAgentInvocationRoute({
    text: inputs.text,
    messageTs: inputs.message_ts,
    threadTs: inputs.thread_ts,
    materialsDropMessageTs: context.materialsDropMessageTs,
    hasFiles,
  });

  // When triggered via channel message events without legacy test input overrides, respect the route
  if (!inputs.dashboard_canvas_content) {
    if (route.type === "ignore") {
      return { outputs: { thread_ts: activeThreadTs } };
    }

    if (route.type === "redirect_materials") {
      await client.chat.postMessage({
        channel: inputs.channel_id,
        thread_ts: activeThreadTs,
        text: materialsRedirectMessage(),
      });
      return { outputs: { thread_ts: activeThreadTs } };
    }

    if (route.type === "help") {
      await client.chat.postMessage({
        channel: inputs.channel_id,
        thread_ts: activeThreadTs,
        text: agentUsageHelpMessage(),
      });
      return { outputs: { thread_ts: activeThreadTs } };
    }

    if (route.type === "delivery") {
      await client.chat.postMessage({
        channel: inputs.channel_id,
        thread_ts: activeThreadTs,
        text: "Delivery Agent is scheduled for delivery phase validation.",
      });
      return { outputs: { thread_ts: activeThreadTs } };
    }
  }

  if (!shouldProceedWithAgent(context)) {
    await client.chat.postMessage({
      channel: inputs.channel_id,
      thread_ts: activeThreadTs,
      text: onboardingGateMessage(),
    });
    return {
      outputs: { thread_ts: activeThreadTs },
    };
  }

  let agentServiceUrl: string;
  try {
    agentServiceUrl = resolveAgentServiceUrl(env);
  } catch (error) {
    logger.emit("invoke.failed", {
      errorClass: error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message : "Missing agent URL",
    }, "ERROR");
    return {
      error: error instanceof Error
        ? error.message
        : "AGENT_SERVICE_URL is required.",
    };
  }

  let fileIds = inputs.file_ids ?? [];
  if (fileIds.length === 0 && client.conversations?.replies) {
    try {
      const replyData = await client.conversations.replies({
        channel: inputs.channel_id,
        ts: inputs.message_ts,
      });
      const message = replyData.messages?.find((m) => m.ts === inputs.message_ts);
      fileIds = message?.files
        ?.map((f) => f.id)
        .filter((id): id is string => Boolean(id)) ?? [];
    } catch {
      fileIds = [];
    }
  }

  const documents: DocumentInput[] = [];

  for (const fileId of fileIds) {
    const fileInfo = await client.files.info({ file: fileId });
    if (!fileInfo.ok || !fileInfo.file) continue;

    const downloadUrl = fileInfo.file.url_private_download;
    if (!downloadUrl) continue;

    const fileResponse = await fetchFile(downloadUrl, {
      headers: {
        Authorization: `Bearer ${client.token}`,
      },
    });

    const buffer = new Uint8Array(await fileResponse.arrayBuffer());
    documents.push({
      filename: fileInfo.file.name ?? fileId,
      mimeType: fileInfo.file.mimetype ?? "application/octet-stream",
      content: buffer,
    });
  }

  // If no files attached, check if user provided inline requirements text
  if (documents.length === 0 && inputs.text) {
    const cleanedText = inputs.text
      .replace(/<@[A-Z0-9]+>|@Sea Trial/gi, "")
      .replace(/^requirements\s*/i, "")
      .trim();

    if (cleanedText.length > 0) {
      documents.push({
        filename: "inline-requirements.txt",
        mimeType: "text/plain",
        content: new TextEncoder().encode(cleanedText),
      });
    }
  }

  let requirementsCanvasContent = inputs.requirements_canvas_content;
  if (!requirementsCanvasContent && context.requirementsCanvasId && client.canvases?.sections) {
    try {
      requirementsCanvasContent = await readCanvasMarkdown(
        client as unknown as CanvasSectionsClient,
        context.requirementsCanvasId,
      );
    } catch {
      requirementsCanvasContent = "# Requirements\n";
    }
  }

  logger.emit("invoke.started", {
    channelId: context.channelId,
    eventId: context.channelId,
    fileCount: documents.length,
  });

  try {
    const response = await callAgent(
      agentServiceUrl,
      buildInvokeAgentRequest(
        context as TesEventContext,
        requirementsCanvasContent ?? "# Requirements\n",
        documents,
        activeThreadTs,
      ),
      logger.correlationId,
    );

    // Staged Proposal Review Gate: do NOT modify Requirements Canvas immediately.
    // Canvas is updated only when the user explicitly clicks [Accept & Update Canvas].
    const proposalMessage = await client.chat.postMessage({
      channel: inputs.channel_id,
      thread_ts: activeThreadTs,
      text: response.agentMessage,
      blocks: buildProposalBlocks(
        response.proposals,
        activeThreadTs,
        {
          canvasId: context.requirementsCanvasId,
          proposedMarkdown: response.canvasMarkdown,
        },
      ),
    });

    logger.emit("invoke.completed", {
      channelId: context.channelId,
      proposalCount: response.proposals.length,
      durationMs: Date.now() - startedAt,
    });

    return {
      outputs: {
        thread_ts: proposalMessage.ts ?? activeThreadTs,
      },
    };
  } catch (error) {
    logger.emit("invoke.failed", {
      channelId: context.channelId,
      errorClass: error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message : "Invoke failed",
      durationMs: Date.now() - startedAt,
    }, "ERROR");
    throw error;
  }
}
