import { DefineWorkflow, Schema } from "@slack/deno-slack-sdk/mod.ts";
import ProvisionChannelFunction from "../functions/provision_channel/mod.ts";
import SeedChannelObjectsFunction from "../functions/seed_channel_objects/mod.ts";

const CreateTesEventWorkflow = DefineWorkflow({
  callback_id: "create_tes_event",
  title: "Create TES Event",
  description: "Provision a TES Event Channel with canvases and lists",
  input_parameters: {
    properties: {
      project_name: { type: Schema.types.string },
      ae_user_id: { type: Schema.slack.types.user_id },
      se_user_id: { type: Schema.slack.types.user_id },
      context_notes: { type: Schema.types.string },
      interactivity: { type: Schema.slack.types.interactivity },
    },
    required: ["project_name", "ae_user_id", "se_user_id", "interactivity"],
  },
});

CreateTesEventWorkflow.addStep(ProvisionChannelFunction, {
  project_name: CreateTesEventWorkflow.inputs.project_name,
  ae_user_id: CreateTesEventWorkflow.inputs.ae_user_id,
  se_user_id: CreateTesEventWorkflow.inputs.se_user_id,
  context_notes: CreateTesEventWorkflow.inputs.context_notes,
  interactivity: CreateTesEventWorkflow.inputs.interactivity,
});

CreateTesEventWorkflow.addStep(SeedChannelObjectsFunction, {
  channel_id: ProvisionChannelFunction.outputs.channel_id,
  project_name: CreateTesEventWorkflow.inputs.project_name,
});

export default CreateTesEventWorkflow;
