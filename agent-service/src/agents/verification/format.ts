import type {
  DeliveryProofBlock,
  VerificationRequest,
  VerificationResponse,
} from "@sea-trial/shared";

function sanitizeConfiguration(config?: string): string {
  if (!config?.trim()) {
    return "Follow Infrastructure canvas for configuration and credentials.";
  }
  const lines = config.split("\n");
  const sanitized = lines.map((line) => {
    if (/(api[_-]?key|secret|password|token|bearer|credential)/i.test(line)) {
      return "[Configuration sanitized - refer to Infrastructure canvas for credentials]";
    }
    return line;
  });
  return sanitized.join("\n");
}

export function formatVerificationProof(
  request: VerificationRequest,
): VerificationResponse {
  const { deliverable, proofInputs, context } = request;

  // 1. Customer summary: 2-sentence non-technical summary
  let customerSummary = "";
  if (proofInputs.notes?.trim()) {
    const sentences = proofInputs.notes.trim().split(/(?<=[.!?])\s+/);
    customerSummary = sentences.slice(0, 2).join(" ");
  }
  if (!customerSummary) {
    customerSummary = `Completed ${deliverable.requirements || deliverable.taskId}. Verified technical implementation and operational outcomes.`;
  }

  // 2. Visual Proof: Preserve exact human-supplied URL, never invent
  const visualProofUrl = proofInputs.visualProofUrl?.trim();
  const visualProofMarkdown = visualProofUrl
    ? `[Demo Loom Video](${visualProofUrl})`
    : "_No visual proof link provided._";

  // 3. Components
  const componentsList = (proofInputs.components && proofInputs.components.length > 0)
    ? proofInputs.components
    : (context.derivedComponents && context.derivedComponents.length > 0)
      ? context.derivedComponents
      : ["SailPoint Identity Security Cloud"];
  const componentsMarkdown = componentsList.join(", ");

  // 4. External technologies
  const externalTechnologiesList = (proofInputs.externalTechnologies && proofInputs.externalTechnologies.length > 0)
    ? proofInputs.externalTechnologies
    : deliverable.category && deliverable.category !== "Uncategorized"
      ? [deliverable.category]
      : [];
  const externalTechnologiesMarkdown = externalTechnologiesList.length > 0
    ? externalTechnologiesList.join(", ")
    : "_None specified_";

  // 5. Artefacts & Config
  const artefactsAndConfig = sanitizeConfiguration(proofInputs.configuration);

  // Markdown block conforming to canonical schema
  const proofBlockMarkdown = [
    "### Delivery Proof & Outcome",
    "<!-- populated by Verification Agent on delivery completion -->",
    `- **Customer Summary:** ${customerSummary}`,
    `- **Visual Proof:** ${visualProofMarkdown}`,
    `- **Components:** ${componentsMarkdown}`,
    `- **External Technologies:** ${externalTechnologiesMarkdown}`,
    `- **Artefacts & Config:** ${artefactsAndConfig}`,
  ].join("\n");

  const proof: DeliveryProofBlock = {
    customerSummary,
    visualProofUrl: visualProofUrl || undefined,
    components: componentsList,
    externalTechnologies: externalTechnologiesList,
    artefactsAndConfig,
  };

  return {
    proofBlockMarkdown,
    proof,
    status: "Complete",
  };
}
