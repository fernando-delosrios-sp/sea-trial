# Sea Trial — Smoke Test Checklist

Run in Slack dev tenant after deploying slack-app and agent-service.

## Execution log

> **Required before marking task 8.2 complete.** Record results below.

| Date | Tester | Workspace | Result | Notes |
|------|--------|-----------|--------|-------|
| 2026-08-07 | _pending deploy_ | dev tenant | ⏳ | Automated tests pass. Manual smoke after CI deploy (triggers provisioned automatically). |

## Channel provisioning

- [ ] Invoke "Create TES Event" global shortcut
- [ ] Creation modal shows: Project Name, Account, Salesforce Opportunity URL, Members (multi-select), Context Notes
- [ ] Submit valid project name → channel `#proj-{slug}-tes` created
- [ ] Submit creation form with zero members → inline modal error; no channel created
- [ ] Submit invalid project name → inline modal error; no channel created
- [ ] Selected members plus trigger user invited to channel

## Object seeding

- [ ] Dashboard, Requirements, Infrastructure canvases exist
- [ ] Deliverables and Incidents lists exist
- [ ] Deliverables and Incidents appear as channel bookmarks (channel header) linking to each list
- [ ] Dashboard tells the Sales Engineer to run **Complete onboarding** (no `https://slack.com/shortcuts/` href)
- [ ] **New channel required** after this change — existing channels need Create TES Event again or `repair-tes-event-context.ts` with `TES_EVENT_CONTEXT_JSON` and `SLACK_ONBOARDING_TRIGGER_ID`
- [ ] Pinned index message links all objects
- [ ] Pinned index has no Complete onboarding or Edit onboarding button
- [ ] Seed grants Complete onboarding to the new channel

## Onboarding

- [ ] In a TES Event Channel, run **Complete onboarding** from the shortcut menu → modal opens with all fields
- [ ] In `#oppties`, a TES member sees at most one **Complete onboarding**; invoking it fails clearly (not a TES Event Channel)
- [ ] A user in no TES Event Channel does not see **Complete onboarding**
- [ ] Account field pre-filled from the **create-time** account name
- [ ] Submit form → Dashboard updated, `onboardingComplete` true, Account reflects submitted value; store row replaced; Onboarding tasks shows a ticked Complete onboarding instruction
- [ ] After first submit, run Complete onboarding again → modal prefills last submitted fields
- [ ] Edit fields and submit again → Dashboard opportunity details update; **no second** agent-available channel message
- [ ] Identity Security Cloud → correct components derived
- [ ] Channel message announces agent available when summoned (@mention) **only on first complete**

> **Existing channels:** Store miss fails open. Re-run Create TES Event, or run `scripts/repair-tes-event-context.ts` with `CHANNEL_ID`, `SLACK_ONBOARDING_TRIGGER_ID`, and `TES_EVENT_CONTEXT_JSON`. Then run `scripts/cleanup-onboarding-triggers.ts` so the menu has `Create TES Event` plus one `Complete onboarding` (no `Complete Onboarding ({channelId})` names).

## Agent gate

- [ ] @mention bot before onboarding → blocked with onboarding message
- [ ] @mention bot after onboarding → agent invoked

## Requirements Agent

- [ ] Upload PDF/DOCX/XLSX/txt → agent processes
- [ ] Upload unsupported format → graceful rejection
- [ ] Requirements canvas updated with extracted content
- [ ] Block Kit proposal thread with Accept/Edit/Reject
- [ ] Thread reply re-invokes agent
- [ ] Second session preserves prior canvas content

## Review gate

- [ ] Accept → Deliverables list row created with core fields
- [ ] Accept → Deliverables List row created (no delivery canvas yet)
- [ ] Status → Validation required via **update_deliverable_status** → Delivery Template Canvas created and linked
- [ ] Consolidate draft → invokes `consolidate_delivery` (canvas metadata lists function)
- [ ] Mark reviewed → clears review flag via `mark_delivery_reviewed`
- [ ] Accept → Requirements canvas candidates marked promoted
- [ ] Reject → no list write
- [ ] No button click → list unchanged



