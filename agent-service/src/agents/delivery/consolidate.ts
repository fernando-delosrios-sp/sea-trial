import type {
  DeliveryConsolidationRequest,
  DeliveryConsolidationResponse,
} from "@tes-event-process/shared";

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

function extractSection(markdown: string, heading: string): string {
  const headingIndex = markdown.indexOf(heading);
  if (headingIndex === -1) return "";
  const afterHeading = markdown.slice(headingIndex + heading.length);
  const nextSection = afterHeading.search(/\n## /);
  const body = nextSection === -1
    ? afterHeading
    : afterHeading.slice(0, nextSection);
  return body.replace(/<!--[\s\S]*?-->/g, "").trim();
}

function parseDraftVersion(markdown: string): number {
  const match = markdown.match(/Draft v(\d+)/);
  return match ? Number(match[1]) : 0;
}

function parseAuthor(markdown: string): string | null {
  const match = markdown.match(/\*\*Author:\*\*\s*(.+)/);
  return match?.[1]?.trim().split("·")[0]?.trim() ?? null;
}

function buildSections(
  request: DeliveryConsolidationRequest,
): DeliveryConsolidationSections {
  const { row, context, canvasMarkdown } = request;
  const existingVisual = canvasMarkdown
    ? extractSection(canvasMarkdown, "## Visual proof")
    : "";
  const existingNotes = canvasMarkdown
    ? extractSection(canvasMarkdown, "## Notes")
    : "";

  const hasVisualProof = existingVisual.length > 0 &&
    !existingVisual.includes("_Pending");

  const businessValue = [
    row.requirements.trim(),
    row.situation.trim() !== "New" ? row.situation : "",
  ].filter(Boolean).join(" ");

  const visualProof = hasVisualProof
    ? existingVisual
    : "_Pending — add screenshots, recordings, or links before customer publish._";

  const components = context.derivedComponents.length > 0
    ? context.derivedComponents.map((c) =>
      `- **${c}** — used in this deliverable`
    ).join("\n")
    : "- _Pending component mapping_";

  const externalTech = row.category.trim()
    ? `- **${row.category}** — integration scope from requirements`
    : "- _Pending external technology list_";

  const gapNote = hasVisualProof ? "" : " Visual proof is still pending.";
  const customerSummary = [
    businessValue.slice(0, 200) ||
      `Delivery ${row.taskId} for ${row.category}.`,
    gapNote,
  ].join("").trim();

  const configuration = [
    "Follow Infrastructure canvas for secrets and credentials.",
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
    notes: existingNotes,
  };
}

function renderCanvas(
  request: DeliveryConsolidationRequest,
  sections: DeliveryConsolidationSections,
  draftVersion: number,
): string {
  const { row, canvasMarkdown } = request;
  const author = (canvasMarkdown && parseAuthor(canvasMarkdown)) ||
    row.assigneeDisplay ||
    row.assigneeId ||
    "Unknown";
  const generatedAt = new Date().toISOString().slice(0, 10);

  const lines = [
    `# Delivery: ${row.taskId}`,
    "",
    `> ⚠️ **Agent draft — pending review** · Draft v${draftVersion} · ${generatedAt}`,
    `> **Author:** ${author} · **Category:** ${row.category}`,
    "> **Actions:** [Consolidate draft](#consolidate-draft) · [Mark reviewed](#mark-reviewed)",
    "",
    "---",
    "",
    "## Business value",
    "<!-- customer-facing -->",
    `_Agent-generated — review before sharing_`,
    sections.businessValue,
    "",
    "## Visual proof",
    "<!-- customer-facing -->",
    `_Agent-generated — review before sharing_`,
    sections.visualProof,
    "",
    "## SailPoint components",
    "<!-- customer-facing -->",
    `_Agent-generated — review before sharing_`,
    sections.sailpointComponents,
    "",
    "## External technologies",
    "<!-- customer-facing -->",
    `_Agent-generated — review before sharing_`,
    sections.externalTechnologies,
    "",
    "## Customer summary",
    "<!-- customer-facing · situation-report-excerpt -->",
    `_Agent-generated — review before sharing_`,
    sections.customerSummary,
    "",
    "---",
    "",
    "## Artefacts",
    "<!-- internal -->",
    "| Name | Type | Location | Version |",
    "|------|------|----------|---------|",
    `_Agent-generated — review before sharing_`,
    sections.artefactRows,
    "",
    "## Configuration",
    "<!-- internal -->",
    `_Agent-generated — review before sharing_`,
    sections.configuration,
    "",
    "---",
    "",
    "## Notes",
    "<!-- freeform additions -->",
    sections.notes,
    "",
  ];

  return lines.join("\n");
}

/**
 * Consolidates delivery canvas markdown from list row and optional existing canvas.
 */
export function runDeliveryConsolidation(
  request: DeliveryConsolidationRequest,
): DeliveryConsolidationResponse {
  const draftVersion = request.canvasMarkdown?.trim()
    ? parseDraftVersion(request.canvasMarkdown) + 1
    : 1;
  const sections = buildSections(request);
  const canvasMarkdown = renderCanvas(request, sections, draftVersion);
  return { canvasMarkdown, draftVersion };
}
