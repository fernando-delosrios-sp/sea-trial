import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import type { DocumentInput, TesEventContext } from "@tes/shared/types/index.ts";
import {
  buildProposalBlocks,
  buildInvokeAgentRequest,
  callRequirementsAgent,
  onboardingGateMessage,
  resolveAgentServiceUrl,
} from "../../lib/agent-client.ts";
import { deserializeEventContext } from "../../lib/event-context.ts";
import { shouldProceedWithAgent } from "../../lib/agent-gate.ts";
import { replaceCanvasContent } from "../../lib/canvas.ts";

export const InvokeAgentFunction = DefineFunction({
  callback_id: "invoke_agent",
  title: "Invoke Requirements Agent",
  source_file: "functions/invoke_agent/mod.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      message_ts: { type: Schema.types.string },
      thread_ts: { type: Schema.types.string },
      dashboard_canvas_content: { type: Schema.types.string },
      requirements_canvas_content: { type: Schema.types.string },
      file_ids: {
        type: Schema.types.array,
        items: { type: Schema.types.string },
      },
    },
    required: [
      "channel_id",
      "user_id",
      "message_ts",
      "dashboard_canvas_content",
      "requirements_canvas_content",
    ],
  },
  output_parameters: {
    properties: {
      thread_ts: { type: Schema.types.string },
    },
    required: ["thread_ts"],
  },
});

export default SlackFunction(
  InvokeAgentFunction,
  async ({ inputs, client, env }) => {
    const context = deserializeEventContext(inputs.dashboard_canvas_content);

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

      const fileResponse = await fetch(downloadUrl, {
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

    const response = await callRequirementsAgent(
      agentServiceUrl,
      buildInvokeAgentRequest(
        context as TesEventContext,
        inputs.requirements_canvas_content,
        documents,
        inputs.thread_ts,
      ),
    );

    await replaceCanvasContent(
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

    return {
      outputs: {
        thread_ts: proposalMessage.ts ?? inputs.message_ts,
      },
    };
  },
);

