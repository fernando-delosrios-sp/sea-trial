import { DefineFunction, Schema, SlackFunction } from "@slack/deno-slack-sdk/mod.ts";
import {
  executeOnboardingSubmit,
  parseOnboardingForm,
} from "../../lib/onboarding-view-submit.ts";

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

    const result = await executeOnboardingSubmit(
      client,
      metadata,
      parseOnboardingForm(view.state.values),
    );

    if (!result.ok) {
      return { error: result.error };
    }

    return { completed: true };
  },
);
