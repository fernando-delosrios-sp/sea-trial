import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import {
  createCorrelationId,
  readCorrelationId,
} from "@tes-event-process/observability";
import type { ProcessRequirementsRequest } from "@tes-event-process/shared";
import type { DeliveryConsolidationRequest } from "@tes-event-process/shared";
import {
  runRequirementsAgent,
  validateLlmConfig,
} from "./agents/requirements/graph.js";
import { runRequirementsGraph } from "./agents/requirements/langgraph.js";
import { runDeliveryGraph } from "./agents/delivery/graph.js";
import { createRequestLogger } from "./observability/logger.js";
import { requestContext } from "./observability/request-context.js";

const PORT = Number(process.env.PORT ?? 3000);

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function decodeBase64Payload(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function decodeDocuments(
  body: Record<string, unknown>,
): ProcessRequirementsRequest {
  const filePayloads = body.files as Array<{
    filename: string;
    mimeType: string;
    contentBase64: string;
  }> | undefined;

  const legacyDocuments = body.documents as Array<{
    filename: string;
    mimeType: string;
    content: string;
  }> | undefined;

  const documents = (filePayloads ?? legacyDocuments ?? []).map((doc) => {
    const base64 = "contentBase64" in doc
      ? doc.contentBase64
      : (doc as { content: string }).content;

    return {
      filename: doc.filename,
      mimeType: doc.mimeType,
      content: decodeBase64Payload(base64),
    };
  });

  return {
    ...(body as unknown as ProcessRequirementsRequest),
    documents,
  };
}

function route(req: IncomingMessage, res: ServerResponse): void {
  void handleRoute(req, res);
}

async function handleRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  if (method === "GET" && url === "/health") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (method === "POST" && url === "/agents/requirements/process") {
    const correlationId = readCorrelationId(req.headers["x-correlation-id"]) ??
      createCorrelationId();
    const logger = createRequestLogger(correlationId);

    await requestContext.run({ correlationId, logger }, async () => {
      try {
        validateLlmConfig();
        const raw = await readBody(req);
        const body = JSON.parse(raw) as Record<string, unknown>;
        const request = decodeDocuments(body);

        logger.emit("request.received", {
          fileCount: request.documents.length,
          channelId: request.context.channelId,
          eventId: request.context.channelId,
        });

        const response = await runRequirementsGraph(request);

        logger.emit("agent.completed", {
          proposalCount: response.proposals.length,
          needsClarification: response.needsClarification,
        });

        sendJson(res, 200, response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.emit("request.failed", {
          errorClass: error instanceof Error ? error.name : "Error",
          message,
        }, "ERROR");
        sendJson(res, 500, { error: message });
      } finally {
        await logger.flush();
      }
    });
    return;
  }

  if (method === "POST" && url === "/agents/delivery/consolidate") {
    const correlationId = readCorrelationId(req.headers["x-correlation-id"]) ??
      createCorrelationId();
    const logger = createRequestLogger(correlationId);

    await requestContext.run({ correlationId, logger }, async () => {
      try {
        const raw = await readBody(req);
        const request = JSON.parse(raw) as DeliveryConsolidationRequest;

        logger.emit("delivery.consolidation.received", {
          taskId: request.row.taskId,
          channelId: request.context.channelId,
        });

        const response = runDeliveryGraph(request);

        logger.emit("delivery.consolidation.completed", {
          taskId: request.row.taskId,
          draftVersion: response.draftVersion,
        });

        sendJson(res, 200, response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.emit("delivery.consolidation.failed", { message }, "ERROR");
        sendJson(res, 500, { error: message });
      } finally {
        await logger.flush();
      }
    });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

export function createAppServer() {
  return createServer(route);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  createAppServer().listen(PORT, () => {
    console.log(`agent-service listening on port ${PORT}`);
  });
}
