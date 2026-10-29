# Requirements Canvas

[🚀 Plan Deliverables]({{planDeliverablesUrl}})

## Project
- **Name:** {{projectName}}
- **Channel:** <#{{channelId}}>
- **Account:** {{accountDisplay}}
- **Salesforce Opportunity:** {{salesforceDisplay}}
- **Members:** {{membersDisplay}}
- **Notes:** {{notesDisplay}}
- **Status:** {{statusDisplay}}
{{#if showOpportunityDetails}}

## Opportunity Details
- **Account:** {{opportunityAccount}}
- **Goal:** {{opportunityGoal}}
- **Deal History:** {{opportunityDealHistory}}
- **Project Type:** {{opportunityProjectType}}
- **Stakeholders:** {{opportunityStakeholders}}
- **Competitors:** {{opportunityCompetitors}}
- **Suite:** {{opportunitySuite}}
- **Deadline:** {{opportunityDeadline}}
- **Notes:** {{opportunityNotes}}
{{/if}}
{{#if hasDerivedComponents}}

## Derived Components
{{#each derivedComponents}}
- {{this}}
{{/each}}
{{/if}}

---

## Extracted Requirements
_No requirements extracted yet. Drop specification documents into the pinned Materials & Requirements Drop thread to summon the Requirements Agent._

## REQ-01: Sample Requirement Title
- **Status:** Open
- **Linked Deliverables:** `TASK-01`
- **Customer Need:** Customer business requirement description

### Acceptance Criteria
- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2

### Delivery Proof & Outcome
<!-- populated by Verification Agent on delivery completion -->
- **Customer Summary:** 
- **Visual Proof:** 
- **Components:** 
- **External Technologies:** 
- **Artefacts & Config:** 

## Deliverable Candidates
_Candidates will appear here after agent processing._

## Session Log
_Agent sessions will be logged here._
