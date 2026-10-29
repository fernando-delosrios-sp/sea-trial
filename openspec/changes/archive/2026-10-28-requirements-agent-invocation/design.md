## Context

Sea Trial provisions TES Event Channels (`#proj-*-tes`) to coordinate technical engagements between AE, SE, and TES delivery teams. Document parsing and semantic reasoning for the Requirements Agent are implemented in `agent-service/` using LangGraph.js and Node.js document parsers, but the Slack app entrypoint (`InvokeAgentFunction`) is not wired to Slack event triggers, workflows, or a channel intake mechanism. Additionally, the workspace needs to support multiple agents (e.g. Requirements Agent, Delivery Agent) under the same `@Sea Trial` bot identity.

Exploration confirmed that Slack's Web API cannot programmatically create bookmark folders (`bookmarks.add` with `type: "folder"` returns `invalid_arguments`) and Slack fires no webhook events when users add bookmarks. To give users an automated "Materials" intake space, the provisioning process will post and pin a dedicated "📁 Materials & Requirements Drop" message. A channel-scoped `message_posted` event trigger will route replies in that thread to the Requirements Agent, while routing `@Sea Trial <subcommand>` messages according to the requested agent.

## Goals / Non-Goals

**Goals:**
- Automatically provision and pin a "📁 Materials & Requirements Drop" message during channel seeding.
- Persist `materialsDropMessageTs` in `TesEventContext` (stored in `TesEventContextDatastore`).
- Provision a channel-scoped `message_posted` event trigger on TES Event Channels.
- Dispatch to Requirements Agent on any file share or message in the Materials Drop thread.
- Support explicit multi-agent sub-command routing on `@Sea Trial` mentions (e.g. `@Sea Trial requirements`, `@Sea Trial delivery`).
- Ignore normal channel chatter in <50ms without invoking agent reasoning.
- Run interactive refinement conversations in-thread and populate the Deliverables List when proposals are accepted.

**Non-Goals:**
- Creating Slack bookmark folders via undocumented internal APIs.
- External cloud drive webhooks (Google Drive / Box / SharePoint) for MVP.
- NLP-based agent routing without explicit sub-commands.
- Background vector databases or external memory services (MVP remains Slack-native).

## Decisions

### D1: Pinned Materials Drop thread as the native document drop zone
- **Choice**: During `provisionChannelObjects`, post a message titled `📁 Materials & Requirements Drop` in the channel, pin it using `pins.add`, and store the resulting message timestamp in `TesEventContext.materialsDropMessageTs`.
- **Reason**: Slack API does not support programmatic creation of bookmark folders or webhook notifications for bookmark modifications. A pinned thread provides an immediate, discoverable, Slack-native file drop area with first-class event triggers.
- **Considered alternatives**: Relying on manual folder creation (rejected: cannot be automated); monitoring all channel messages for any file (rejected: risks accidental processing of unrelated images/screenshots).

### D2: Unified channel-scoped `message_posted` trigger
- **Choice**: Provision a single `slack#/events/message_posted` event trigger per TES Event Channel pointing to `InvokeAgentWorkflow`.
- **Reason**: A single trigger captures both thread replies to the Materials Drop thread and `@Sea Trial` mentions, avoiding duplicate trigger grants and permissions.
- **Considered alternatives**: Dual triggers (`app_mentioned` + `message_posted` file filter) (rejected: doubles trigger provisioning and grant overhead in Slack Next-Gen platform).

### D3: Fast-exit gate for channel chatter
- **Choice**: The workflow entry handler immediately evaluates:
  1. Is `thread_ts === context.materialsDropMessageTs`? → Route to Requirements Agent.
  2. Does the message text mention the bot user ID? → Route to sub-command dispatcher.
  3. Is `thread_ts` an existing proposal thread continuation? → Route to Requirements Agent.
  4. Otherwise → Exit immediately with `{ outputs: { handled: false } }`.
- **Reason**: Prevents bot spam and avoids unnecessary HTTP calls or LLM execution on general channel conversation.
- **Considered alternatives**: Slack trigger-level regex filters (rejected: brittle and limited in Deno Slack API schema).

### D4: Explicit sub-command multi-agent dispatcher
- **Choice**: When a mention is detected, parse the token following the mention. If `requirements`, invoke Requirements Agent; if `delivery`, invoke Delivery Agent; if absent or unknown, reply with a short usage message: `Usage: @Sea Trial <requirements | delivery> [instructions]`.
- **Reason**: Clean, deterministic dispatch across multiple agents sharing a single bot user identity without ambiguous routing or LLM classification latency.
- **Considered alternatives**: Intent-classification LLM prompt (rejected: adds latency and token cost to every mention); separate Slack bots per agent (rejected: violates single Sea Trial app model).

### D5: In-thread conversation and review gate integration
- **Choice**: The agent posts its proposals as a reply to the triggering thread (either Materials Drop or the @mention thread), using Block Kit Accept/Edit/Reject buttons. Clicking "Accept" invokes `AcceptProposalsFunction`, updating the Deliverables List and Requirements Canvas in place.
- **Reason**: Preserves single-thread conversational context and adheres to the mandatory Review Gate (no automatic list writes).

## Risks / Trade-offs

- [Risk] Pinned Materials Drop message deleted or unpinned by user -> Mitigation: Handler falls back gracefully if `materialsDropMessageTs` is missing, allowing users to summon via `@Sea Trial requirements` at any time.
- [Risk] Large file downloads timing out during Slack invocation -> Mitigation: Handler downloads raw bytes asynchronously with streaming array buffers and passes directly to agent-service.
- [Trade-off] Requires explicit `@Sea Trial requirements` sub-command rather than raw `@Sea Trial` -> Reason: Future-proofs the app for Delivery and other planned agents without ambiguous routing.

## Migration Plan

1. Add `materialsDropMessageTs` optional field to `TesEventContext` in `packages/shared`.
2. Update `channel-provisioner.ts` to post and pin the Materials Drop message and include its timestamp in context stored to the datastore.
3. Implement `slack-app/workflows/invoke_agent.ts` and `slack-app/triggers/channel_message_posted.ts`.
4. Update `invoke-agent-handler.ts` to load context from `TesEventContextStore`, inspect thread/mention type, and dispatch.
5. Wire `triggers.config.yaml` and `provision-triggers.ts` for channel-scoped trigger deployment.
6. Run `deno task test` in `slack-app/` and `npm test` in `agent-service/`.

## Open Questions

_None blocking. All architectural forks resolved._
