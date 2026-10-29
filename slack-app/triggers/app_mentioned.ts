import {
  TriggerContextData,
  TriggerEventTypes,
  TriggerTypes,
} from "@slack/deno-slack-api/mod.ts";
import InvokeAgentWorkflow from "../workflows/invoke_agent.ts";

/**
 * Workspace-wide event trigger for @Sea Trial mentions across channels where the app is present.
 */
const appMentionedTrigger = {
  type: TriggerTypes.Event,
  name: "App Mentioned",
  description: "Triggers when Sea Trial is @mentioned",
  workflow: `#/workflows/${InvokeAgentWorkflow.definition.callback_id}`,
  event: {
    event_type: TriggerEventTypes.AppMentioned,
    all_resources: true,
  },
  inputs: {
    channel_id: {
      value: TriggerContextData.Event.AppMentioned.channel_id,
    },
    user_id: {
      value: TriggerContextData.Event.AppMentioned.user_id,
    },
    message_ts: {
      value: TriggerContextData.Event.AppMentioned.message_ts,
    },
    text: {
      value: TriggerContextData.Event.AppMentioned.text,
    },
  },
};

export default appMentionedTrigger;
