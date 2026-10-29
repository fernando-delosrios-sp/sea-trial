export interface ExtractedRequirementProof {
  requirementRef: string;
  customerSummary: string;
  visualProofUrl?: string;
  components?: string[];
  artefactsAndConfig?: string;
}

/**
 * Extracts verified customer summaries and demo links from REQ-XX proof blocks
 * in the Requirements Canvas markdown for Situation Report generation.
 */
export function extractRequirementProofsFromCanvas(
  canvasMarkdown: string,
): ExtractedRequirementProof[] {
  const proofs: ExtractedRequirementProof[] = [];
  const reqSections = canvasMarkdown.split(/(?=\n##\s+REQ-)/);

  for (const section of reqSections) {
    const match = section.match(/##\s+(REQ-\d+)[:\s]/);
    if (!match) continue;

    const requirementRef = match[1];
    const proofMatch = section.match(
      /### Delivery Proof & Outcome[\s\S]*?(?=\n## |\n### |$)/,
    );
    if (!proofMatch) continue;

    const proofText = proofMatch[0];
    const summaryMatch = proofText.match(/- \*\*Customer Summary:\*\*\s*(.+)/);
    const visualMatch = proofText.match(/- \*\*Visual Proof:\*\*\s*(.+)/);
    const compMatch = proofText.match(/- \*\*Components:\*\*\s*(.+)/);
    const configMatch = proofText.match(/- \*\*Artefacts & Config:\*\*\s*(.+)/);

    const customerSummary = summaryMatch?.[1]?.trim() ?? "";
    const visualProofMarkdown = visualMatch?.[1]?.trim() ?? "";
    const urlMatch = visualProofMarkdown.match(/https?:\/\/[^\s)>]+/);

    const components = compMatch?.[1]
      ? compMatch[1].split(",").map((c) => c.trim())
      : undefined;

    proofs.push({
      requirementRef,
      customerSummary,
      visualProofUrl: urlMatch?.[0],
      components,
      artefactsAndConfig: configMatch?.[1]?.trim(),
    });
  }

  return proofs;
}
