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
    },
    required: ["interactivity", "channel_id"],
  },
});

OpenOnboardingWorkflow.addStep(OpenOnboardingFunction, {
  interactivity: OpenOnboardingWorkflow.inputs.interactivity,
  channel_id: OpenOnboardingWorkflow.inputs.channel_id,
});

export default OpenOnboardingWorkflow;
