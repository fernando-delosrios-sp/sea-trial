import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import type { OnboardingForm } from "@tes/shared/types/index.ts";
import { deserializeEventContext } from "../../lib/event-context.ts";
import { processOnboardingSubmit } from "../../lib/onboarding-submit.ts";
import { replaceCanvasContent } from "../../lib/canvas.ts";

export const SubmitOnboardingFunction = DefineFunction({
  callback_id: "submit_onboarding",
  title: "Submit Onboarding",
  source_file: "functions/submit_onboarding/mod.ts",
  input_parameters: {
    properties: {
      view: { type: Schema.types.object },
    },
    required: ["view"],
  },
  output_parameters: { properties: {}, required: [] },
});

function getInputValue(
  state: Record<string, Record<string, unknown>>,
  blockId: string,
): string {
  const block = state[blockId];
  if (!block) return "";
  const value = block.value;
  if (typeof value === "string") return value;
  const selected = block.value as { selected_option?: { value: string } };
  return selected?.selected_option?.value ?? "";
}

export default SlackFunction(
  SubmitOnboardingFunction,
  async ({ inputs, client }) => {
    const view = inputs.view as {
      private_metadata: string;
      state: { values: Record<string, Record<string, unknown>> };
    };

    const metadata = JSON.parse(view.private_metadata) as {
      channel_id: string;
      dashboard_canvas_content: string;
    };
    const values = view.state.values;

    const form: OnboardingForm = {
      accountName: getInputValue(values, "customer_name"),
      mainProspectGoal: getInputValue(values, "main_prospect_goal"),
      dealHistory: getInputValue(values, "deal_history"),
      projectType: getInputValue(values, "project_type"),
      stakeholders: getInputValue(values, "stakeholders"),
      competitors: getInputValue(values, "competitors"),
      sailpointSuite: getInputValue(values, "sailpoint_suite"),
      deadline: getInputValue(values, "deadline"),
      notes: getInputValue(values, "notes"),
    };

    const existingContext = deserializeEventContext(
      metadata.dashboard_canvas_content,
    );

    if (!existingContext) {
      return { error: "Could not load TesEventContext from Dashboard canvas." };
    }

    const { context, dashboardContent } = processOnboardingSubmit(
      existingContext,
      form,
    );

    await replaceCanvasContent(
      client,
      context.dashboardCanvasId,
      dashboardContent,
    );

    await client.chat.postMessage({
      channel: metadata.channel_id,
      text:
        "✅ Onboarding complete! The Requirements Agent is now available — @mention the bot with your requirement documents.",
    });

    return { completed: true };
  },
);

