## Context

Sea Trial (slack-app) provisions TES Event Channels via a Deno Slack SDK workflow. The MVP archived with `provision_channel` and `seed_channel_objects` functions, but the global shortcut trigger was never wired to a creation modal. Users who invite the bot manually get no canvases, lists, or `TesEventContext`.

Explore session (2026-08-07) locked a two-step flow: TES creation modal → in-channel onboarding button → summon-only Requirements Agent. Architecture remains one Slack app + agent-service (D3/D3a from MVP).

## Goals / Non-Goals

**Goals:**

- Global shortcut opens creation modal with project name, Account, Salesforce URL, members, context notes
- Successful submit creates channel, invites members, seeds objects, writes Dashboard `## Project`, pins index with onboarding button
- Onboarding modal pre-fills Account (editable); submit enriches dashboard and opens agent gate
- Agent remains summon-only via `@mention`; blocked until onboarding complete

**Non-Goals:**

- Salesforce API lookup or validation
- Auto-invoking agent on create or onboarding submit
- Second Slack app
- Slash command for onboarding (MVP)
- Changing agent-service HTTP contract beyond optional context fields already in `TesEventContext`

## Decisions

### D1: Two-step form (creation + onboarding)

- **Choice:** Creation modal at trigger; onboarding modal in channel via button
- **Reason:** Different actors (TES vs AE/SE) and different timing; matches original brainstorm Q4/Q5
- **Considered alternatives:** Single combined form (too heavy); onboarding-only trigger (no TES control of members/SF link)

### D2: Creation modal via interactivity workflow step

- **Choice:** Shortcut trigger → `open_create_tes_event` function opens modal → view submission → `create_tes_event` workflow (provision + seed)
- **Reason:** Deno Slack SDK pattern for modals; reuses existing workflow steps
- **Considered alternatives:** Shortcut directly to workflow with Slack native form (limited fields); Bolt-style listeners (not used in this app)

### D3: Member invitation via multi_users_select

- **Choice:** `member_user_ids: string[]` in context; provision invites all selected users plus trigger user
- **Reason:** Flexible membership; replaces empty AE/SE placeholders
- **Considered alternatives:** Fixed AE/SE pickers (too rigid)

### D4: Account field lifecycle

- **Choice:** Set at creation in `TesEventContext.accountName`; pre-fill onboarding Account input; editable on submit — onboarding value overwrites context
- **Reason:** TES sets identity early; SE can correct without re-provisioning
- **Considered alternatives:** Read-only at onboarding (rejected — typo correction needed)

### D5: Salesforce URL store-only

- **Choice:** Persist URL string in context and dashboard link; no fetch or validation beyond optional URL shape
- **Reason:** MVP constraint; phase 2 can add CRM integration
- **Considered alternatives:** Required valid SF URL (blocks dev tenants without real opps)

### D6: Onboarding CTA as Block Kit button

- **Choice:** Pinned index includes `complete_onboarding` button with interactivity; removes dependency on slash command for MVP
- **Reason:** User preference; visible in channel
- **Considered alternatives:** Slash command only; message shortcut

### D7: Dashboard section ownership

- **Choice:** `## Project` at seed (creation fields); `## Opportunity Details` + `## Derived Components` after onboarding
- **Reason:** Clear separation of TES operational vs delivery scope data
- **Considered alternatives:** Single flat dashboard (harder to scan)

### D8: Summon-only agent (unchanged)

- **Choice:** No agent call on provision or onboarding; `@mention` + files after gate open
- **Reason:** SE controls timing; existing `shouldProceedWithAgent` gate sufficient
- **Considered alternatives:** Welcome message triggers agent (rejected)

## Risks / Trade-offs

- [Risk] Trigger not deployed in workspace after code change → Mitigation: Document `slack trigger create` in tasks; smoke-test checklist step
- [Risk] Pinned index button interactivity requires workflow/link trigger for block actions → Mitigation: Wire `open_onboarding` via block_actions or update pinned message pattern per SDK capabilities
- [Risk] `customerName` → `accountName` rename breaks existing tests/context → Mitigation: Update shared types and all references in one change
- [Trade-off] No SF URL validation → Accepted for MVP; store-only

## Migration Plan

1. Extend `TesEventContext` in `packages/shared` (additive fields + rename)
2. Implement creation modal + trigger wiring
3. Update provision to use member list
4. Update seed/dashboard template and pinned index blocks
5. Update onboarding pre-fill and labels
6. Deploy slack-app; create/update shortcut trigger in workspace
7. Manual smoke test per `docs/smoke-test-checklist.md`

Rollback: Revert slack-app deploy; existing channels with old metadata remain readable if deserialize is backward-compatible (keep optional fields).

## Open Questions

- Exact block_actions wiring for pinned index button (SDK version-specific — resolve during implementation spike)
- Whether trigger user is auto-included in member list or must be explicitly selected
