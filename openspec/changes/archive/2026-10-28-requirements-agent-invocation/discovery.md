## Scope

Wire the Requirements Agent to Slack channel interactions via a pinned Materials Drop thread and an explicit `@Sea Trial requirements` sub-command, implement channel-scoped `message_posted` event routing, support multi-agent dispatch, run multi-turn interactive refinement in thread, incrementally synchronize the Requirements Canvas, and populate the Deliverables List upon proposal acceptance.

## Language

**Materials Drop Thread** (`promote`):
A pinned Slack message in a TES Event Channel dedicated to receiving requirements documents and kickoff files, where thread replies and file attachments automatically invoke the Requirements Agent.
_Avoid_: upload folder, materials folder, bookmark folder.

**Agent Sub-Command** (`promote`):
An explicit identifier following the `@Sea Trial` bot mention (e.g. `@Sea Trial requirements` or `@Sea Trial delivery`) that routes the invocation to the corresponding domain agent.
_Avoid_: implicit mention, free-form bot mention.

**Requirements Refinement Thread** (`promote`):
An interactive Slack message thread where the Requirements Agent and users converse to clarify scope, review deliverable candidates, and trigger Deliverables List writes.
_Avoid_: proposal channel, bot chat.

## Decisions

- **D1: Pinned Materials Drop thread for document intake**: Because Slack's public Web API lacks an endpoint to create bookmark folders (`type: "folder"` returns `invalid_arguments`) and provides no event notifications when items are bookmarked, the bot provisions and pins a `📁 Materials & Requirements Drop` message during channel seeding. Its timestamp is saved in `TesEventContext.materialsDropMessageTs`.
- **D2: Channel-scoped `message_posted` event trigger**: A single `slack#/events/message_posted` event trigger is provisioned per TES Event Channel. It dispatches to the agent workflow when a message is posted in the Materials Drop thread OR when the bot is @mentioned with an explicit sub-command. Regular chatter outside these conditions exits in <50ms.
- **D3: Explicit sub-command multi-agent routing**: Mentions of `@Sea Trial` inspect the sub-command immediately following the mention. `@Sea Trial requirements` routes to the Requirements Agent; `@Sea Trial delivery` routes to the Delivery Agent. Unrecognized or missing sub-commands reply with guidance listing available agents.
- **D4: Interactive thread conversation & list population**: The Requirements Agent runs its LangGraph analysis on files attached to the Materials Drop thread or @mention, asks clarifying questions if incomplete, posts proposals with Block Kit buttons (Accept/Edit/Reject), syncs Requirements Canvas markdown, and writes accepted items directly to the Deliverables List.

## Open questions

_None. All forks resolved during verbal discovery._

## Scenarios discussed

- File uploaded to Materials Drop thread: User drops `PRD.docx` in the pinned thread without an @mention. The bot detects the file share, invokes the Requirements Agent, parses the document, and replies in the thread with candidate proposals.
- Explicit @mention with requirements sub-command: User posts `@Sea Trial requirements here are the SOW points` with an attached XLSX file. The router dispatches to the Requirements Agent, which parses the XLSX and posts proposals.
- @mention with unknown or missing sub-command: User posts `@Sea Trial help`. The router detects no valid sub-command and replies with usage instructions without invoking heavy agent reasoning.
- Unrelated channel conversation: Team members chat about meeting times in the main channel. The event trigger evaluates the message, sees it is neither in the Materials Drop thread nor an @mention, and exits immediately.
- Interactive proposal acceptance: User clicks "Accept" on a deliverable proposal in the thread. `accept_proposals` writes the row to the Deliverables List and updates the Requirements Canvas with an accepted status.
