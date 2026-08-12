import type { DeliverableStatus, TesEventContext } from "@tes/shared/types/index.ts";
import { readCanvasMarkdown, replaceCanvasContent } from "./canvas.ts";
import { deserializeEventContext } from "./event-context.ts";
import {
  fetchDeliverablesListRows,
  type SlackListReadClient,
} from "./lists.ts";
import {
  buildSituationReportMarkdown,
  type SituationReportRow,
} from "./situation-report.ts";

export interface PublishSituationReportClient extends SlackListReadClient {
  canvases: {
    edit: (params: {
      canvas_id: string;
      changes: Array<{
        operation: string;
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

export interface PublishSituationReportResult {
  ok: boolean;
  error?: string;
}

function toSituationReportRows(
  rows: Awaited<ReturnType<typeof fetchDeliverablesListRows>>,
): SituationReportRow[] {
  return rows.map((row) => ({
    taskId: row.taskId,
    internalStatus: row.status as DeliverableStatus,
    situation: row.situation,
    category: row.category,
    deliverableUrl: row.deliverableUrl,
    openQuestions: row.openQuestions,
  }));
}

/**
 * Publishes the Situation Report canvas from the current Deliverables List.
 */
export async function runPublishSituationReport(
  client: PublishSituationReportClient,
  context: TesEventContext,
): Promise<PublishSituationReportResult> {
  if (!context.onboardingComplete) {
    return {
      ok: false,
      error: "Complete onboarding before publishing a situation report.",
    };
  }

  if (!context.situationReportCanvasId?.trim()) {
    return {
      ok: false,
      error: "Situation Report canvas is not provisioned for this channel.",
    };
  }

  if (!context.deliverablesListId?.trim()) {
    return {
      ok: false,
      error: "Deliverables list is not provisioned for this channel.",
    };
  }

  const listRows = await fetchDeliverablesListRows(
    client,
    context.deliverablesListId,
  );
  const reportRows = toSituationReportRows(listRows);

  let previousMarkdown: string | undefined;
  try {
    previousMarkdown = await readCanvasMarkdown(
      client,
      context.situationReportCanvasId,
    );
  } catch {
    previousMarkdown = undefined;
  }

  const generatedAt = new Date().toISOString().slice(0, 10);
  const markdown = buildSituationReportMarkdown(context, reportRows, {
    generatedAt,
    previousMarkdown,
  });

  await replaceCanvasContent(
    client,
    context.situationReportCanvasId,
    markdown,
  );

  return { ok: true };
}

/** Loads event context from dashboard canvas markdown embedded in button value. */
export function loadContextFromDashboardMarkdown(
  dashboardMarkdown: string,
): TesEventContext | null {
  return deserializeEventContext(dashboardMarkdown);
}
