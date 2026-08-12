import type { DeliverableStatus, TesEventContext } from "@tes/shared/types/index.ts";

export const REVIEW_BANNER_TEXT = "Agent draft — pending review";
export const SECTION_AGENT_MARKER =
  "_Agent-generated — review before sharing_";
export const EXCERPT_PENDING =
  "_Pending delivery canvas structure_";
export const EXCERPT_REVIEW_PENDING =
  "_Delivery draft pending review_";
export const CUSTOMER_SUMMARY_HEADING = "## Customer summary";
export const VISUAL_PROOF_HEADING = "## Visual proof";
export const EXCERPT_MAX_LENGTH = 500;

export interface DeliveryCanvasInput {
  taskId: string;
  category: string;
  author: string;
  draftVersion: number;
  generatedAt: string;
  reviewPending: boolean;
  businessValue: string;
  visualProof: string;
  sailpointComponents: string;
  externalTechnologies: string;
  customerSummary: string;
  artefactRows: string;
  configuration: string;
  notes: string;
  consolidateActionUrl?: string;
  markReviewedActionUrl?: string;
}

export interface DeliverableListRowForDelivery {
  taskId: string;
  assigneeId?: string;
  assigneeDisplay?: string;
  status: DeliverableStatus | string;
  situation: string;
  category: string;
  requirements: string;
  openQuestions?: string;
  deliverableUrl?: string;
}

export interface DeliveryConsolidationSections {
  businessValue: string;
  visualProof: string;
  sailpointComponents: string;
  externalTechnologies: string;
  customerSummary: string;
  artefactRows: string;
  configuration: string;
  notes: string;
}

/** Returns true when a canvas should be created for this status transition. */
export function shouldCreateDeliveryCanvas(
  newStatus: string,
  existingDeliverableUrl?: string,
): boolean {
  return newStatus === "Validation required" &&
    !(existingDeliverableUrl?.trim());
}

/** Parses canvas:ID from list deliverable field. */
export function parseCanvasDeliverableRef(deliverableUrl?: string): string | null {
  if (!deliverableUrl?.startsWith("canvas:")) return null;
  const id = deliverableUrl.slice("canvas:".length).trim();
  return id.length > 0 ? id : null;
}

/** Formats list deliverable field for a canvas link. */
export function formatCanvasDeliverableRef(canvasId: string): string {
  return `canvas:${canvasId}`;
}

/** Detects review-pending state from canvas markdown. */
export function isDeliveryReviewPending(markdown: string): boolean {
  return markdown.includes(REVIEW_BANNER_TEXT);
}

/** Extracts Author from metadata block. */
export function parseDeliveryAuthor(markdown: string): string | null {
  const match = markdown.match(/\*\*Author:\*\*\s*(.+)/);
  return match?.[1]?.trim().split("·")[0]?.trim() ?? null;
}

/** Parses draft version integer from metadata. */
export function parseDraftVersion(markdown: string): number {
  const match = markdown.match(/Draft v(\d+)/);
  return match ? Number(match[1]) : 0;
}

/** Extracts section body by H2 heading. */
export function extractSection(markdown: string, heading: string): string {
  const headingIndex = markdown.indexOf(heading);
  if (headingIndex === -1) return "";

  const afterHeading = markdown.slice(headingIndex + heading.length);
  const nextSection = afterHeading.search(/\n## /);
  const body = nextSection === -1
    ? afterHeading
    : afterHeading.slice(0, nextSection);
  return body.replace(/<!--[\s\S]*?-->/g, "").trim();
}

/** Extracts first URL from Visual proof section. */
export function extractHeroProofLink(markdown: string): string | null {
  const section = extractSection(markdown, VISUAL_PROOF_HEADING);
  const linkMatch = section.match(/https?:\/\/[^\s)>]+/);
  return linkMatch?.[0] ?? null;
}

/** Builds Situation Report delivery excerpt from canvas markdown. */
export function extractDeliveryExcerpt(
  canvasMarkdown?: string,
): string {
  if (!canvasMarkdown?.trim()) {
    return EXCERPT_PENDING;
  }
  if (isDeliveryReviewPending(canvasMarkdown)) {
    return EXCERPT_REVIEW_PENDING;
  }

  const summary = extractSection(canvasMarkdown, CUSTOMER_SUMMARY_HEADING)
    .replace(SECTION_AGENT_MARKER, "")
    .trim();
  if (!summary) {
    return EXCERPT_PENDING;
  }

  let excerpt = summary.length > EXCERPT_MAX_LENGTH
    ? `${summary.slice(0, EXCERPT_MAX_LENGTH - 1)}…`
    : summary;

  const heroLink = extractHeroProofLink(canvasMarkdown);
  if (heroLink) {
    excerpt = `${excerpt} [Proof](${heroLink})`;
  }
  return excerpt;
}

/** Clears review banner and section markers. */
export function clearDeliveryReviewFlag(markdown: string): string {
  let updated = markdown.replace(
    /> ⚠️ \*\*Agent draft — pending review\*\* · /,
    "> ",
  );
  updated = updated.replace(
    /> ⚠️ \*\*Agent draft — pending review\*\*\n/,
    "> ",
  );
  return updated.split(SECTION_AGENT_MARKER).join("").trimEnd() + "\n";
}

/** Applies review banner and section markers to standard sections. */
export function applyDeliveryReviewFlag(markdown: string): string {
  let updated = markdown;
  if (!updated.includes(REVIEW_BANNER_TEXT)) {
    updated = updated.replace(
      /^# Delivery:[^\n]+\n\n> /m,
      (match) => match.replace("> ", "> ⚠️ **Agent draft — pending review** · "),
    );
  }

  const sectionHeadings = [
    "## Business value",
    "## Visual proof",
    "## SailPoint components",
    "## External technologies",
    "## Customer summary",
    "## Artefacts",
    "## Configuration",
  ];

  for (const heading of sectionHeadings) {
    const pattern = new RegExp(
      `(${escapeRegex(heading)}\\s*\\n(?:<!--[^>]*-->\\s*\\n)?)(?!${escapeRegex(SECTION_AGENT_MARKER)})`,
    );
    updated = updated.replace(
      pattern,
      `$1${SECTION_AGENT_MARKER}\n`,
    );
  }
  return updated;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Builds consolidation sections from list row and optional existing canvas. */
export function buildConsolidationSections(
  row: DeliverableListRowForDelivery,
  derivedComponents: string[],
  existingCanvasMarkdown?: string,
): DeliveryConsolidationSections {
  const existingVisual = existingCanvasMarkdown
    ? extractSection(existingCanvasMarkdown, "## Visual proof")
    : "";
  const existingNotes = existingCanvasMarkdown
    ? extractSection(existingCanvasMarkdown, "## Notes")
    : "";

  const hasVisualProof = existingVisual.length > 0 &&
    !existingVisual.includes("_Pending");

  const businessValue = [
    row.requirements.trim(),
    row.situation.trim() !== "New" ? row.situation : "",
  ].filter(Boolean).join(" ");

  const visualProof = hasVisualProof
    ? existingVisual.replace(SECTION_AGENT_MARKER, "").trim()
    : "_Pending — add screenshots, recordings, or links before customer publish._";

  const components = derivedComponents.length > 0
    ? derivedComponents.map((c) => `- **${c}** — used in this deliverable`).join("\n")
    : "- _Pending component mapping_";

  const externalTech = row.category.trim()
    ? `- **${row.category}** — integration scope from requirements`
    : "- _Pending external technology list_";

  const gapNote = hasVisualProof
    ? ""
    : " Visual proof is still pending.";
  const customerSummary = [
    businessValue.slice(0, 200) || `Delivery ${row.taskId} for ${row.category}.`,
    gapNote,
  ].join("").trim();

  const configuration = [
    "Follow Infrastructure canvas for secrets and credentials.",
    "",
    row.openQuestions?.trim()
      ? `Open items: ${row.openQuestions.trim()}`
      : "",
  ].filter(Boolean).join("\n");

  return {
    businessValue: businessValue ||
      `_Describe customer impact for ${row.taskId}._`,
    visualProof,
    sailpointComponents: components,
    externalTechnologies: externalTech,
    customerSummary,
    artefactRows: "| _Pending_ | — | — | — |",
    configuration,
    notes: existingNotes.replace(SECTION_AGENT_MARKER, "").trim(),
  };
}

/** Renders delivery canvas markdown from structured input. */
export function renderDeliveryCanvasMarkdown(
  input: DeliveryCanvasInput,
): string {
  const reviewPrefix = input.reviewPending
    ? "⚠️ **Agent draft — pending review** · "
    : "";

  const consolidateUrl = input.consolidateActionUrl ?? "#consolidate-draft";
  const markReviewedUrl = input.markReviewedActionUrl ?? "#mark-reviewed";

  const lines = [
    `# Delivery: ${input.taskId}`,
    "",
    `> ${reviewPrefix}Draft v${input.draftVersion} · ${input.generatedAt}`,
    `> **Author:** ${input.author} · **Category:** ${input.category}`,
    `> **Actions:** [Consolidate draft](${consolidateUrl}) · [Mark reviewed](${markReviewedUrl})`,
    "",
    "---",
    "",
    "## Business value",
    "<!-- customer-facing -->",
    input.businessValue,
    "",
    "## Visual proof",
    "<!-- customer-facing -->",
    input.visualProof,
    "",
    "## SailPoint components",
    "<!-- customer-facing -->",
    input.sailpointComponents,
    "",
    "## External technologies",
    "<!-- customer-facing -->",
    input.externalTechnologies,
    "",
    "## Customer summary",
    "<!-- customer-facing · situation-report-excerpt -->",
    input.customerSummary,
    "",
    "---",
    "",
    "## Artefacts",
    "<!-- internal -->",
    "| Name | Type | Location | Version |",
    "|------|------|----------|---------|",
    input.artefactRows,
    "",
    "## Configuration",
    "<!-- internal -->",
    input.configuration,
    "",
    "---",
    "",
    "## Notes",
    "<!-- freeform additions -->",
    input.notes,
    "",
  ];

  let markdown = lines.join("\n");
  if (input.reviewPending) {
    markdown = applyDeliveryReviewFlag(markdown);
  }
  return markdown;
}

/** Builds canvas after consolidation from list row and agent sections. */
export function buildDeliveryCanvasFromConsolidation(
  row: DeliverableListRowForDelivery,
  sections: DeliveryConsolidationSections,
  options: {
    draftVersion: number;
    generatedAt: string;
    author: string;
    reviewPending?: boolean;
    consolidateActionUrl?: string;
    markReviewedActionUrl?: string;
  },
): string {
  return renderDeliveryCanvasMarkdown({
    taskId: row.taskId,
    category: row.category,
    author: options.author,
    draftVersion: options.draftVersion,
    generatedAt: options.generatedAt,
    reviewPending: options.reviewPending ?? true,
    businessValue: sections.businessValue,
    visualProof: sections.visualProof,
    sailpointComponents: sections.sailpointComponents,
    externalTechnologies: sections.externalTechnologies,
    customerSummary: sections.customerSummary,
    artefactRows: sections.artefactRows,
    configuration: sections.configuration,
    notes: sections.notes,
    consolidateActionUrl: options.consolidateActionUrl,
    markReviewedActionUrl: options.markReviewedActionUrl,
  });
}

/** Resolves author for consolidation — preserves manual edits. */
export function resolveDeliveryAuthor(
  row: DeliverableListRowForDelivery,
  existingCanvasMarkdown?: string,
): string {
  const existingAuthor = existingCanvasMarkdown
    ? parseDeliveryAuthor(existingCanvasMarkdown)
    : null;
  if (existingAuthor) return existingAuthor;
  return row.assigneeDisplay ?? row.assigneeId ?? "Unknown";
}

/** Computes next draft version for consolidation. */
export function nextDraftVersion(existingCanvasMarkdown?: string): number {
  if (!existingCanvasMarkdown?.trim()) return 1;
  return parseDraftVersion(existingCanvasMarkdown) + 1;
}

/** Pure consolidation pipeline used by slack-app and tests. */
export function consolidateDeliveryCanvasLocally(
  row: DeliverableListRowForDelivery,
  context: TesEventContext,
  existingCanvasMarkdown?: string,
): string {
  const sections = buildConsolidationSections(
    row,
    context.derivedComponents,
    existingCanvasMarkdown,
  );
  const author = resolveDeliveryAuthor(row, existingCanvasMarkdown);
  return buildDeliveryCanvasFromConsolidation(row, sections, {
    draftVersion: nextDraftVersion(existingCanvasMarkdown),
    generatedAt: new Date().toISOString().slice(0, 10),
    author,
    reviewPending: true,
  });
}
