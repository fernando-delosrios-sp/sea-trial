import { DefineWorkflow, Schema } from "@slack/deno-slack-sdk/mod.ts";
import { OpenOnboardingFunction } from "../functions/open_onboarding/mod.ts";

const OpenOnboardingWorkflow = DefineWorkflow({
  callback_id: "open_onboarding_workflow",
  title: "Open Onboarding",
  description: "Open the TES onboarding modal in a TES Event Channel",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel_id: { type: Schema.slack.types.channel_id },
      dashboard_canvas_content: { type: Schema.types.string },
      dashboard_canvas_id: { type: Schema.types.string },
    },
    required: ["interactivity", "channel_id"],
  },
});

OpenOnboardingWorkflow.addStep(OpenOnboardingFunction, {
  interactivity: OpenOnboardingWorkflow.inputs.interactivity,
  channel_id: OpenOnboardingWorkflow.inputs.channel_id,
  dashboard_canvas_content: OpenOnboardingWorkflow.inputs.dashboard_canvas_content,
  dashboard_canvas_id: OpenOnboardingWorkflow.inputs.dashboard_canvas_id,
});

export default OpenOnboardingWorkflow;
