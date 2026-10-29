import type { DeliverableProposal } from "@sea-trial/shared";

/**
 * Extracts explicit deliverables from parsed text without merging distinct items.
 * Tags each deliverable with source document provenance [filename.ext].
 */
export function extractDeliverables(
  texts: string[],
  derivedComponents: string[],
): { proposals: DeliverableProposal[]; outOfScope: string[] } {
  const proposals: DeliverableProposal[] = [];
  const outOfScope: string[] = [];
  let taskCounter = 1;

  for (const text of texts) {
    const docMatch = text.match(/^\[(.*?)\]/);
    const sourceDocName = docMatch ? docMatch[1] : "document";
    const provenanceTag = `[${sourceDocName}]`;

    const lines = text.split("\n").filter((l) => l.trim().length > 10);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line === provenanceTag || line.startsWith(`[${sourceDocName}]`)) {
        // If the line already starts with the provenance tag, check if it has content beyond the tag
        const stripped = line.slice(provenanceTag.length).trim();
        if (!stripped) continue;
      }

      const isOutOfScope =
        !derivedComponents.some((c) =>
          line.toLowerCase().includes(c.toLowerCase()),
        ) &&
        derivedComponents.length > 0 &&
        line.includes("SAP");

      if (isOutOfScope) {
        outOfScope.push(line);
        continue;
      }

      if (
        line.toLowerCase().includes("deliverable") ||
        line.toLowerCase().includes("implement") ||
        line.toLowerCase().includes("configure") ||
        line.toLowerCase().includes("requirement")
      ) {
        const cleaned = line.replace(/^[-*•]\s*/, "").trim();
        const formattedReq = cleaned.startsWith(provenanceTag)
          ? cleaned
          : `${provenanceTag} ${cleaned}`;

        proposals.push({
          taskId: `TES-${String(taskCounter++).padStart(3, "0")}`,
          category: "Requirements",
          requirements: formattedReq,
          sourceDocRef: sourceDocName,
          provenanceTag,
          suggestedStatus: "Not started",
        });
      }
    }
  }

  return { proposals, outOfScope };
}
