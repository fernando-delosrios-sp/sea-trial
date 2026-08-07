import { DefineWorkflow, Schema } from "@slack/deno-slack-sdk/mod.ts";
import { OpenCreateTesEventFunction } from "../functions/open_create_tes_event/mod.ts";
import { ProvisionChannelFunction } from "../functions/provision_channel/mod.ts";
import { SeedChannelObjectsFunction } from "../functions/seed_channel_objects/mod.ts";

const CreateTesEventWorkflow = DefineWorkflow({
  callback_id: "create_tes_event",
  title: "Create TES Event",
  description:
    "Open the creation modal, then provision a TES Event Channel with canvases and lists",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
    },
    required: ["interactivity"],
  },
});

const openStep = CreateTesEventWorkflow.addStep(OpenCreateTesEventFunction, {
  interactivity: CreateTesEventWorkflow.inputs.interactivity,
});

const provisionStep = CreateTesEventWorkflow.addStep(ProvisionChannelFunction, {
  project_name: openStep.outputs.project_name,
  member_user_ids: openStep.outputs.member_user_ids,
  submitting_user_id: openStep.outputs.submitting_user_id,
  context_notes: openStep.outputs.context_notes,
  interactivity: CreateTesEventWorkflow.inputs.interactivity,
});

CreateTesEventWorkflow.addStep(SeedChannelObjectsFunction, {
  channel_id: provisionStep.outputs.channel_id,
  project_name: openStep.outputs.project_name,
  account_name: openStep.outputs.account_name,
  salesforce_opportunity_url: openStep.outputs.salesforce_opportunity_url,
  member_user_ids: openStep.outputs.member_user_ids,
  context_notes: openStep.outputs.context_notes,
});

export default CreateTesEventWorkflow;


