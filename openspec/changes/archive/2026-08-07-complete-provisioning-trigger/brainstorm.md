# Brainstorm — Complete Provisioning Trigger

Raw capture of design exploration session (2026-08-07).

## Background

The TES Slack Process MVP scaffolded channel provisioning via a global shortcut, but the entry point was never completed: the trigger passes empty AE/SE IDs, no creation modal exists, and inviting the bot to a channel manually does not seed canvases or context. The user expected the process to start from a TES-triggered form that creates a fully structured TES Event Channel, followed by in-channel onboarding and a summon-only Requirements Agent.

Existing architecture (one Slack app + agent-service) remains correct; this change completes the provisioning UX gap.

## Decision Chain

### Q1: Where does the process start?

**Answer:** A manual global shortcut ("Create TES Event") opens a creation modal. Salesforce API integration is out of scope; store the opportunity URL only.

### Q2: One form or two?

**Answer:** Two steps (original intent). Creation modal (TES team) → in-channel onboarding modal (AE/SE). Agent is summon-only via `@mention` after onboarding completes.

### Q3: Creation modal fields?

**Answer:** Project name (→ `#proj-{slug}-tes`), Account, Salesforce opportunity URL (store only), initial members (`multi_users_select`), optional context notes.

### Q4: Member model?

**Answer:** Select from Slack user list (multi-select). Replace fixed AE/SE fields.

### Q5: Prospect vs customer terminology?

**Answer:** Use **Account** everywhere. Account captured at creation; pre-filled and **editable** in onboarding modal. Submitted onboarding value wins.

### Q6: Where do context notes go?

**Answer:** Dashboard `## Project` section (not a separate channel message).

### Q7: How is onboarding opened?

**Answer:** Block Kit **button** on pinned index message ("Complete onboarding"). Slash command not required for MVP.

### Q8: One Slack app or two?

**Answer:** One Slack app (Sea Trial) + external agent-service. Two Slack apps rejected (UX fragmentation, context ownership).

### Q9: What does "run the agent" mean?

**Answer:** Only human-initiated `@mention` with file attachments. No auto-start. Agent blocked until onboarding complete (suite scope required). Thread replies re-summon after first successful invocation.

## Dashboard Layout (agreed)

```
## Project          ← at creation
- Name, Channel, Account, Salesforce link, Members, Context notes, Onboarding status

## Opportunity Details   ← after onboarding submit
- Goal, deal history, suite, etc.

## Derived Components    ← after onboarding submit
```

## Trade-offs

- **Account at creation + editable at onboarding:** TES sets identity early; SE can correct typos without re-provisioning.
- **Store-only Salesforce URL:** No CRM validation; phase 2 can add lookup without changing channel structure.
- **Button-only onboarding CTA:** Simpler than slash command; requires interactivity wiring on pinned index blocks.

## Out of scope

- Salesforce API integration
- Auto-invoking agent on channel creation or onboarding submit
- Second Slack app for provisioning vs agent
- Slash command for onboarding (MVP)

## Approvals

User confirmed all decisions through explore session ending 2026-08-07.
