import type { OnboardingForm, TesEventContext } from "@tes/shared/types/index.ts";
import { serializeEventContext } from "../lib/event-context.ts";

export function dashboardTemplate(
  context: TesEventContext,
  form?: OnboardingForm,
): string {
  const details = form ?? context.onboarding;

  return [
    "# TES Event Dashboard",
    "",
    "## Project",
    `- **Name:** ${context.projectName}`,
    `- **Channel:** <#${context.channelId}>`,
    `- **Onboarding:** ${context.onboardingComplete ? "✅ Complete" : "⏳ Pending"}`,
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

