import type { DeliverableProposal } from "@sea-trial/shared";

/**
 * Extracts explicit deliverables from parsed text without merging distinct items.
 */
export function extractDeliverables(
  texts: string[],
  derivedComponents: string[],
): { proposals: DeliverableProposal[]; outOfScope: string[] } {
  const proposals: DeliverableProposal[] = [];
  const outOfScope: string[] = [];
  let taskCounter = 1;

  for (const text of texts) {
    const lines = text.split("\n").filter((l) => l.trim().length > 10);

    for (const line of lines) {
      const isOutOfScope = !derivedComponents.some((c) =>
        line.toLowerCase().includes(c.toLowerCase())
      ) && derivedComponents.length > 0 && line.includes("SAP");

      if (isOutOfScope) {
        outOfScope.push(line.trim());
        continue;
      }

      if (
        line.toLowerCase().includes("deliverable") ||
        line.toLowerCase().includes("implement") ||
        line.toLowerCase().includes("configure")
      ) {
        proposals.push({
          taskId: `TES-${String(taskCounter++).padStart(3, "0")}`,
          category: "Requirements",
          requirements: line.trim(),
          sourceDocRef: text.slice(0, 50),
          suggestedStatus: "Not started",
        });
      }
    }
  }

  return { proposals, outOfScope };
}
