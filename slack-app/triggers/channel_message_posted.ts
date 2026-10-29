import {
  TriggerContextData,
  TriggerEventTypes,
  TriggerTypes,
} from "@slack/deno-slack-api/mod.ts";
import InvokeAgentWorkflow from "../workflows/invoke_agent.ts";

/**
 * Channel-scoped event trigger for TES Event Channels.
 * Listens for message events, routing Materials Drop thread replies
 * and explicit @Sea Trial mentions to the agent workflow.
 */
const channelMessagePostedTrigger = {
  type: TriggerTypes.Event,
  name: "Channel Message Posted",
  description: "Triggers on message events in TES Event Channels",
  workflow: `#/workflows/${InvokeAgentWorkflow.definition.callback_id}`,
  event: {
    event_type: TriggerEventTypes.MessagePosted,
    all_resources: true,
    filter: {
      version: 1,
      root: {
        statement: "{{data.thread_ts}} != ''",
      },
    },
  },
  inputs: {
    channel_id: {
      value: TriggerContextData.Event.MessagePosted.channel_id,
    },
    user_id: {
      value: TriggerContextData.Event.MessagePosted.user_id,
    },
    message_ts: {
      value: TriggerContextData.Event.MessagePosted.message_ts,
    },
    thread_ts: {
      value: TriggerContextData.Event.MessagePosted.thread_ts,
    },
    text: {
      value: TriggerContextData.Event.MessagePosted.text,
    },
  },
};

export default channelMessagePostedTrigger;
