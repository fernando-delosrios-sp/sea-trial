import type { OnboardingForm, TesEventContext } from "@tes/shared/types/index.ts";
import { serializeEventContext } from "../lib/event-context.ts";

export function dashboardTemplate(
  context: TesEventContext,
  form?: OnboardingForm,
): string {
  const details = form ?? context.onboarding;

  const members = context.memberUserIds?.length
    ? context.memberUserIds.map((id) => `<@${id}>`).join(", ")
    : "_Not set_";

  return [
    "# TES Event Dashboard",
    "",
    "## Project",
    `- **Name:** ${context.projectName}`,
    `- **Channel:** <#${context.channelId}>`,
    `- **Account:** ${context.accountName ?? "_Not set_"}`,
    `- **Salesforce Opportunity:** ${
      context.salesforceOpportunityUrl ?? "_Not set_"
    }`,
    `- **Members:** ${members}`,
    `- **Notes:** ${context.contextNotes ?? "_Not set_"}`,
    `- **Status:** ${context.onboardingComplete ? "✅ Complete" : "⏳ Pending"}`,
    "",
    details ? "## Opportunity Details" : "",
    details ? `- **Account:** ${details.accountName}` : "",
    details ? `- **Goal:** ${details.mainProspectGoal}` : "",
    details ? `- **Deal History:** ${details.dealHistory}` : "",
    details ? `- **Project Type:** ${details.projectType}` : "",
    details ? `- **Stakeholders:** ${details.stakeholders}` : "",
    details ? `- **Competitors:** ${details.competitors}` : "",
    details ? `- **Suite:** ${details.sailpointSuite}` : "",
    details ? `- **Deadline:** ${details.deadline}` : "",
    details ? `- **Notes:** ${details.notes}` : "",
    "",
    context.derivedComponents.length
      ? "## Derived Components"
      : "",
    ...context.derivedComponents.map((c) => `- ${c}`),
    "",
    serializeEventContext(context),
  ].filter((line) => line !== "").join("\n");
}

export function requirementsTemplate(): string {
  return [
    "# Requirements Canvas",
    "",
    "## Extracted Requirements",
    "_No requirements extracted yet. @mention the bot with documents to begin._",
    "",
    "## Deliverable Candidates",
    "_Candidates will appear here after agent processing._",
    "",
    "## Session Log",
    "_Agent sessions will be logged here._",
  ].join("\n");
}

export function infrastructureTemplate(): string {
  return [
    "# Infrastructure Canvas",
    "",
    "## Environment Notes",
    "_Document infrastructure details here._",
    "",
    "## Connectors & Integrations",
    "_List target systems and connector requirements._",
  ].join("\n");
}

export function pinnedIndexMessage(context: TesEventContext): string {
  return [
    "📋 *TES Event Channel Index*",
    "",
    `- <canvas:${context.dashboardCanvasId}|Dashboard>`,
    `- <canvas:${context.requirementsCanvasId}|Requirements>`,
    `- <canvas:${context.infrastructureCanvasId}|Infrastructure>`,
    `- <list:${context.deliverablesListId}|Deliverables>`,
    `- <list:${context.incidentsListId}|Incidents>`,
    "",
    context.onboardingComplete
      ? "✅ Onboarding complete — @mention the bot with documents to run the Requirements Agent."
      : "⏳ *Complete onboarding* to unlock the Requirements Agent.",
  ].join("\n");
}

/**
 * Builds Block Kit blocks for the pinned index message. Includes a
 * "Complete onboarding" button (`action_id: "complete_onboarding"`) until
 * onboarding is complete. Interactivity wiring to `open_onboarding` happens
 * separately.
 */
export function pinnedIndexBlocks(
  context: TesEventContext,
): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: pinnedIndexMessage(context) },
    },
  ];

  if (!context.onboardingComplete) {
    blocks.push({
      type: "actions",
      block_id: "pinned_index_actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Complete onboarding" },
          style: "primary",
          action_id: "complete_onboarding",
        },
      ],
    });
  }

  return blocks;
}


