import { DefineDatastore, Schema } from "@slack/deno-slack-sdk/mod.ts";

/** Slack Datastore for compact TesEventContext JSON, keyed by TES Event Channel ID. */
export const TES_EVENT_CONTEXT_DATASTORE_NAME = "tes_event_context";

export const TesEventContextDatastore = DefineDatastore({
  name: TES_EVENT_CONTEXT_DATASTORE_NAME,
  primary_key: "channel_id",
  attributes: {
    channel_id: { type: Schema.types.string },
    snapshot: { type: Schema.types.string },
  },
});
