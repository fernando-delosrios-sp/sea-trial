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
import { replaceCanvasContent, type SlackCanvasClient } from "./canvas.ts";
import type { AppLogger } from "./logger.ts";

export interface InvokeAgentInputs {
  channel_id: string;
  user_id: string;
  message_ts: string;
  thread_ts?: string;
  dashboard_canvas_content: string;
  requirements_canvas_content: string;
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

  const context = deserializeEventContext(inputs.dashboard_canvas_content);
  if (!context) {
    throw new Error("Invalid dashboard canvas context");
  }

  if (!shouldProceedWithAgent(context)) {
    await client.chat.postMessage({
      channel: inputs.channel_id,
      thread_ts: inputs.thread_ts ?? inputs.message_ts,
      text: onboardingGateMessage(),
    });
    return {
      outputs: { thread_ts: inputs.thread_ts ?? inputs.message_ts },
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

  const documents: DocumentInput[] = [];

  for (const fileId of inputs.file_ids ?? []) {
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
        inputs.requirements_canvas_content,
        documents,
        inputs.thread_ts,
      ),
      logger.correlationId,
    );

    await replaceCanvas(
      client,
      context.requirementsCanvasId,
      response.canvasMarkdown,
    );

    const proposalMessage = await client.chat.postMessage({
      channel: inputs.channel_id,
      thread_ts: inputs.thread_ts ?? inputs.message_ts,
      text: response.agentMessage,
      blocks: buildProposalBlocks(
        response.proposals,
        inputs.thread_ts ?? inputs.message_ts,
      ),
    });

    logger.emit("invoke.completed", {
      channelId: context.channelId,
      proposalCount: response.proposals.length,
      durationMs: Date.now() - startedAt,
    });

    return {
      outputs: {
        thread_ts: proposalMessage.ts ?? inputs.message_ts,
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

