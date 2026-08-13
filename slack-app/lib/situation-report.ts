import type { DeliverableStatus, TesEventContext } from "@sea-trial/shared/types/index.ts";
import {
  getCustomerBucketDisplayName,
  mapToCustomerStatus,
  type CustomerStatusBucket,
} from "./content/domain.ts";
import { loadValidatedCanvasTemplate } from "./content/template-loader.ts";

import {
  extractDeliveryExcerpt,
} from "./delivery-canvas.ts";

export interface SituationReportRow {
  taskId: string;
  internalStatus: DeliverableStatus;
  situation: string;
  category: string;
  deliverableUrl?: string;
  openQuestions?: string;
  deliveryCanvasMarkdown?: string;
}

export interface ChangelogRow {
  date: string;
  summary: string;
  highlights: string;
}

const NOT_SET = "_Not set_";
const EMPTY_STATE =
  "_No publish yet. Use **Publish situation report** on the pinned index when ready._";

export { extractDeliveryExcerpt };

let cachedTemplate: ReturnType<typeof loadTemplate> | null = null;

function loadTemplate() {
  return loadValidatedCanvasTemplate("canvases/situation-report.hbs.md");
}

/** Resets cached template — for tests only. */
export function resetSituationReportCacheForTests(): void {
  cachedTemplate = null;
}

function countByBucket(rows: SituationReportRow[]): Record<CustomerStatusBucket, number> {
  const counts: Record<CustomerStatusBucket, number> = {
    in_progress: 0,
    needs_input: 0,
    in_review: 0,
    complete: 0,
    out_of_scope: 0,
  };
  for (const row of rows) {
    const mapping = mapToCustomerStatus(row.internalStatus);
    counts[mapping.bucket as CustomerStatusBucket] += 1;
  }
  return counts;
}

function buildBlockersSummary(rows: SituationReportRow[]): string {
  const blockers = rows.filter((row) =>
    row.internalStatus === "Blocked" ||
    row.internalStatus === "Needs clarification"
  );
  if (blockers.length === 0) return "_None_";
  return blockers.map((row) => `**${row.taskId}** — ${row.situation}`).join("; ");
}

function buildOpenQuestionsRollup(rows: SituationReportRow[]): string {
  const questions = rows
    .flatMap((row) =>
      row.openQuestions?.trim()
        ? [`**${row.taskId}:** ${row.openQuestions.trim()}`]
        : []
    );
  return questions.length > 0 ? questions.join("; ") : "_None_";
}

function buildExecutiveSummaryNarrative(
  rows: SituationReportRow[],
  counts: Record<CustomerStatusBucket, number>,
): string {
  if (rows.length === 0) {
    return "_No deliverables in the list yet._";
  }
  const active = counts.in_progress + counts.in_review + counts.needs_input;
  const complete = counts.complete;
  return `${rows.length} deliverable(s) tracked; ${active} active, ${complete} complete.`;
}

function formatDeliverableLink(url?: string): string {
  if (!url?.trim()) return NOT_SET;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return `<${trimmed}|View deliverable>`;
  }
  return trimmed;
}

function buildItemBlock(row: SituationReportRow): string {
  const customerStatus = mapToCustomerStatus(row.internalStatus).label;
  const deliveryExcerpt = extractDeliveryExcerpt(row.deliveryCanvasMarkdown);
  const lines = [
    `#### ${row.taskId} — ${customerStatus}`,
    `- **Situation:** ${row.situation || NOT_SET}`,
    `- **Deliverable:** ${formatDeliverableLink(row.deliverableUrl)}`,
    `- **Open questions:** ${row.openQuestions?.trim() || NOT_SET}`,
    `- **Delivery excerpt:** ${deliveryExcerpt}`,
  ];
  return lines.join("\n");
}

function buildCurrentSituationBody(rows: SituationReportRow[]): string {
  if (rows.length === 0) return EMPTY_STATE;

  const byCategory = new Map<string, SituationReportRow[]>();
  for (const row of rows) {
    const category = row.category?.trim() || "Uncategorized";
    const group = byCategory.get(category) ?? [];
    group.push(row);
    byCategory.set(category, group);
  }

  const sections: string[] = [];
  for (const [category, items] of [...byCategory.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    sections.push(`### ${category}`);
    sections.push(items.map(buildItemBlock).join("\n\n"));
  }
  return sections.join("\n\n");
}

/** Parses existing changelog table rows from canvas markdown (excludes header). */
export function parseChangelogRows(markdown: string): ChangelogRow[] {
  const changelogIndex = markdown.indexOf("## Changelog");
  if (changelogIndex === -1) return [];

  const tableSection = markdown.slice(changelogIndex);
  const lines = tableSection.split("\n");
  const rows: ChangelogRow[] = [];

  for (const line of lines) {
    if (!line.startsWith("|") || line.includes("---") || line.includes("Date |")) {
      continue;
    }
    const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (cells.length >= 3) {
      rows.push({
        date: cells[0],
        summary: cells[1],
        highlights: cells[2],
      });
    }
  }
  return rows;
}

/** Extracts the prior Generated date from canvas markdown. */
export function parseGeneratedAt(markdown: string): string | null {
  const match = markdown.match(/\*\*Generated:\*\*\s*(.+)/);
  return match?.[1]?.trim() ?? null;
}

/** Compresses the prior snapshot into a single changelog row. */
export function compressPriorSnapshot(previousMarkdown: string): ChangelogRow {
  const date = parseGeneratedAt(previousMarkdown) ?? "Unknown";
  const summaryMatch = previousMarkdown.match(
    /## Executive summary\s*\n+\s*([^\n|]+)/,
  );
  const summary = summaryMatch?.[1]?.trim() ?? "Prior snapshot";
  const blockersMatch = previousMarkdown.match(
    /\*\*Key blockers:\*\*\s*(.+)/,
  );
  const highlights = blockersMatch?.[1]?.trim() ?? "_No highlights recorded_";
  return { date, summary, highlights };
}

function formatChangelogTableRows(rows: ChangelogRow[]): string {
  if (rows.length === 0) {
    return "| _No prior publishes_ | — | — |";
  }
  return rows.map((row) =>
    `| ${row.date} | ${row.summary} | ${row.highlights} |`
  ).join("\n");
}

export interface BuildSituationReportOptions {
  generatedAt?: string;
  previousMarkdown?: string;
}

/** Builds full Situation Report markdown from deliverable rows. */
export function buildSituationReportMarkdown(
  context: TesEventContext,
  rows: SituationReportRow[],
  options: BuildSituationReportOptions = {},
): string {
  const generatedAt = options.generatedAt ?? new Date().toISOString().slice(0, 10);
  const counts = countByBucket(rows);

  const priorRows = options.previousMarkdown
    ? parseChangelogRows(options.previousMarkdown)
    : [];
  if (options.previousMarkdown && parseGeneratedAt(options.previousMarkdown)) {
    priorRows.unshift(compressPriorSnapshot(options.previousMarkdown));
  }

  const template = loadTemplate();
  return template({
    projectName: context.projectName,
    accountDisplay: context.accountName ?? NOT_SET,
    generatedAt,
    executiveSummaryNarrative: buildExecutiveSummaryNarrative(rows, counts),
    countInProgress: counts.in_progress,
    countNeedsInput: counts.needs_input,
    countInReview: counts.in_review,
    countComplete: counts.complete,
    countOutOfScope: counts.out_of_scope,
    blockersSummary: buildBlockersSummary(rows),
    openQuestionsRollup: buildOpenQuestionsRollup(rows),
    currentSituationBody: buildCurrentSituationBody(rows),
    changelogRows: formatChangelogTableRows(priorRows),
  }).trim();
}

/** Seed markdown before the first publish. */
export function buildSituationReportSeedMarkdown(
  context: TesEventContext,
): string {
  return buildSituationReportMarkdown(context, [], {
    generatedAt: NOT_SET,
  });
}

/** Ensures customer-facing report never exposes internal-only field names. */
export function projectCustomerFields(
  row: SituationReportRow,
): Record<string, string> {
  const customerStatus = mapToCustomerStatus(row.internalStatus);
  return {
    task_id: row.taskId,
    customer_status: customerStatus.label,
    situation: row.situation,
    deliverable: row.deliverableUrl ?? "",
    open_questions: row.openQuestions ?? "",
  };
}

/** Bucket labels for tests and docs. */
export { getCustomerBucketDisplayName };
