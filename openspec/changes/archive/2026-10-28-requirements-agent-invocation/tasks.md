## 1. Shared Types & Event Context

- [x] 1.1 Add `materialsDropMessageTs?: string` to `TesEventContext` in `packages/shared/src/types/index.ts`
- [x] 1.2 Update `serializeEventContextSnapshot` and `deserializeEventContext` in `slack-app/lib/event-context.ts` to serialize and restore `materialsDropMessageTs`
- [x] 1.3 Add test coverage in `slack-app/tests/event_context_test.ts` for `materialsDropMessageTs` round-trip

## 2. Channel Seeding & Materials Drop Message

- [x] 2.1 Update `provisionChannelObjects` in `slack-app/lib/content/channel-provisioner.ts` to post and pin the `📁 Materials & Requirements Drop` message
- [x] 2.2 Record the pinned message timestamp into `TesEventContext.materialsDropMessageTs` and persist it via `putTesEventContext`
- [x] 2.3 Update `slack-app/tests/channel_provisioner_test.ts` or `slack-app/tests/provision_test.ts` to verify the message is posted, pinned, and saved in context

## 3. Workflow & Trigger Definition

- [x] 3.1 Create `slack-app/workflows/invoke_agent.ts` defining the workflow for agent invocation from message events
- [x] 3.2 Define `slack-app/triggers/channel_message_posted.ts` for channel-scoped `message_posted` events
- [x] 3.3 Add `channel_message_posted` entry to `slack-app/triggers.config.yaml`
- [x] 3.4 Register `InvokeAgentWorkflow` in `slack-app/manifest.ts`

## 4. Message Router & Multi-Agent Dispatch

- [x] 4.1 Update `slack-app/lib/invoke-agent-handler.ts` to load `TesEventContext` from `getTesEventContext` (store) instead of requiring raw canvas markdown inputs
- [x] 4.2 Add fast-exit logic for non-target chatter (<50ms)
- [x] 4.3 Implement multi-agent sub-command parsing (`@Sea Trial requirements` vs `@Sea Trial delivery`) with fallback help message
- [x] 4.4 Implement Materials Drop thread detection matching `thread_ts === context.materialsDropMessageTs`
- [x] 4.5 Fetch attached file IDs from message and download raw bytes using Slack client
- [x] 4.6 Read Requirements Canvas markdown using `readCanvasMarkdown` before calling `agent-service`
- [x] 4.7 Post proposals with Block Kit buttons (Accept/Edit/Reject) in the active thread

## 5. Verification

- [x] 5.1 Confirm canonical test commands: `deno task test` in `slack-app/` and `npm test` in `agent-service/`
- [x] 5.2 Add unit and integration tests in `slack-app/tests/agent_invoke_test.ts` and `slack-app/tests/invoke_agent_handler_test.ts` covering Materials Drop thread detection, `@Sea Trial requirements` sub-command, chatter fast-exit, and help response
- [x] 5.3 Ensure all delta spec scenarios pass

## 6. Documentation

- [x] 6.1 Update `README.md` to document the pinned Materials Drop thread, `@Sea Trial requirements` sub-command, and multi-agent dispatch
- [x] 6.2 Update `docs/smoke-test-checklist.md` with verification steps for Materials Drop and `@mention` agent invocation

## 7. Changelog

- [x] 7.1 Create changelog entry using `changelog-generator`
- [x] 7.2 Confirm changelog covers Materials Drop thread, `message_posted` trigger, multi-agent sub-command dispatch, and interactive requirement refinement
