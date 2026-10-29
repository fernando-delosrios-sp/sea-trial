## Why

The Requirements Agent's core LangGraph parsing and reasoning engine is implemented and tested, but it cannot be summoned by users in Slack because no event trigger, message router, or intake mechanism connects Slack events to InvokeAgentFunction. Furthermore, users need an intuitive, automated place to drop requirement files without manually managing Slack bookmark folders or hunting for bot commands. Provisioning a pinned Materials Drop thread at channel creation, wiring a channel-scoped message_posted event trigger, and establishing explicit sub-command routing allows users to drop files or mention @Sea Trial requirements to effortlessly launch an interactive requirements refining conversation that populates the Deliverables List.

## What Changes

**Channel Materials Intake**
- From: No dedicated thread or automated intake space for requirements files; users had to manually create bookmark folders in Slack which do not support API creation or change webhooks.
- To: Channel provisioning automatically posts and pins a `📁 Materials & Requirements Drop` message and records its timestamp in `TesEventContext.materialsDropMessageTs`.
- Reason: Provide a native, automated destination for requirements files that triggers Slack events.
- Impact: Non-breaking; newly seeded channels include the pinned drop thread.

**Agent Summoning & Multi-Agent Dispatch**
- From: `InvokeAgentFunction` exists as an orphaned function without an attached workflow, trigger, or multi-agent routing.
- To: A channel-scoped `message_posted` event trigger passes events to an agent router that dispatches to the Requirements Agent on Materials Drop thread replies or `@Sea Trial requirements` mentions, while reserving `@Sea Trial <agent>` for other domain agents.
- Reason: Allow natural file drops and clear multi-agent summoning without false triggers from normal channel chatter.
- Impact: Non-breaking addition to Slack workflows and triggers.

**Requirements Refinement Thread & List Population**
- From: Proposals were not linked to a live conversation thread for user clarification and direct acceptance into the Deliverables List.
- To: The agent replies directly within the summoning or Materials Drop thread, presents proposals with Block Kit buttons, updates the Requirements Canvas, and populates the Deliverables List when proposals are accepted.
- Reason: Fulfill the end-to-end requirement refinement workflow within Slack.
- Impact: Non-breaking interactive workflow.

## Capabilities

### Modified Capabilities
- `requirements-agent`: Wire Slack app agent invocation to pinned Materials Drop thread replies and `@Sea Trial requirements` sub-commands with multi-turn thread continuation.
- `event-channel`: Seed a pinned Materials & Requirements Drop message during channel creation and record `materialsDropMessageTs` in `TesEventContext`.
- `ubiquitous-language`: Define Materials Drop Thread, Agent Sub-Command, and Requirements Refinement Thread terms.

## Impact

- `slack-app/workflows/invoke_agent.ts`: New workflow wrapping `InvokeAgentFunction`.
- `slack-app/triggers/channel_message_posted.ts`: Channel-scoped event trigger for TES Event Channels.
- `slack-app/lib/invoke-agent-handler.ts`: Multi-agent sub-command dispatch, Materials Drop thread detection, and context loading from `TesEventContextStore`.
- `slack-app/lib/content/channel-provisioner.ts`: Post and pin the Materials Drop message and save `materialsDropMessageTs` in context.
- `packages/shared/src/types/index.ts`: Add `materialsDropMessageTs?: string` to `TesEventContext`.
- `slack-app/triggers.config.yaml`: Include `channel_message_posted` trigger definition.
