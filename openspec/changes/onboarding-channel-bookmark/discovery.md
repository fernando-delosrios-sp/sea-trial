## Scope

**In:** Retire per-channel Onboarding Link Triggers. Persist `TesEventContext` in a Slack Datastore keyed by channel ID. Enable one global `Complete onboarding` shortcut that uses the channel in view; grant run access to members of TES Event Channels as each channel is seeded. Open and submit load and write that row. Delete existing `Complete Onboarding ({channelId})` triggers. **Out:** Making the pinned button open the modal; hiding the global shortcut from `#oppties` for people who belong to a TES Event Channel; Workflows tab, App Home, slash commands, agent-service, automatic repair of every old channel.

## Language

**Onboarding entry point** (`promote`):
The workspace shortcut `Complete onboarding`. It opens the modal for the channel in view by reading the TES Event Context Store. It is not per-channel, not a bookmark, and not the pinned index button.
_Avoid_: pinned-button opener, bookmark-as-opener, Onboarding Link Trigger

**TES Event Context Store** (`promote`):
A Slack Datastore whose primary key is the TES Event Channel ID and whose item is the compact `TesEventContext` JSON. Seed `put`s; open `get`s; submit `put`s.
_Avoid_: trigger inputs as source of truth, canvas markdown as source of truth, external database

**Onboarding Link Trigger** (`conflicts-with-canonical`):
Canonical per-channel `Complete Onboarding ({channelId})` shortcut. Retired — replaced by the global `Complete onboarding` shortcut plus the store.
_Avoid_: per-channel trigger, share URL as Dashboard href

**Trigger context snapshot** (`conflicts-with-canonical`):
Canonical: compact JSON in trigger inputs. This change: the datastore item for that channel. No copy is required on the pinned button or in trigger inputs.
_Avoid_: baked trigger inputs, `dashboard_canvas_content` as a trigger input

**Shortcut menu visibility** (`promote`):
Slack lists a trigger in the shortcut menu of every channel a permitted user opens. Grants select people (directly, or as members of a granted channel), never the channel in view. One global `Complete onboarding` is the accepted listing; per-channel names are not.
_Avoid_: channel-scoped shortcut menu entry

## Decisions

**Q1 — Can any trigger permission scope the menu to the current channel?** No.

**Q2 — Can a global trigger reduce the problem?** Yes, to one name. Members of TES Event Channels still see it in `#oppties`. **Accepted 2026-08-30.** Click outside a TES Event Channel fails; click inside uses that channel's store row.

**Q3 — Bookmark as discoverable entry?** Optional navigation only. It cannot open the modal (pinned button is dead). Not required for the opener.

**Q4 — Can the pinned button open the modal with no live function?** **No (2026-08-30).** See design.md Blocking finding.

**Q5 — Edit after complete?** The same global shortcut. Prefill from the store row after submit `put`.

**Q6 — TES Event Context Store?** **Yes.** Snapshot cannot live on the pinned button; a canvas click cannot supply `channel_id`.

**Q7 — Snapshot refresh on submit?** `put` the store row for that channel ID. Drop `onboardingTriggerId` and `onboardingLinkUrl`.

**Q8 — Existing channels?** Cleanup deletes per-channel triggers. Repair `put`s a store row and grants the global shortcut to that channel. Not automatic for every old channel.

**Q9 — `Create TES Event` access?** Unchanged: collaborators only.

## Open questions

1. ~~Pinned button without a trigger?~~ **No.**
2. Bookmark upkeep if the pinned index is re-posted. Deferred.

## Scenarios discussed

- Seed `put`s a store row and grants `Complete onboarding` to the new channel; no `Complete Onboarding ({channelId})` trigger.
- A user in no TES Event Channel does not see `Complete onboarding`.
- A user in at least one TES Event Channel sees one `Complete onboarding` (including in `#oppties`).
- Shortcut in a TES Event Channel opens the modal from that channel's row.
- Shortcut in `#oppties` fails clearly (no store row).
- Submit `put`s the row; re-open prefills; no second agent-available message.
- Cleanup removes leftover per-channel onboarding triggers.
