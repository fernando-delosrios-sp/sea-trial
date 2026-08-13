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
- [ ] Pinned index message links all objects
- [ ] Onboarding CTA visible when onboarding incomplete

## Onboarding

- [ ] Click "Complete onboarding" on pinned index → modal opens with all fields
- [ ] Account field pre-filled from creation context (editable)
- [ ] Submit form → Dashboard updated, `onboardingComplete` true, Account reflects submitted value
- [ ] Identity Security Cloud → correct components derived
- [ ] Channel message announces agent available when summoned (@mention)

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



