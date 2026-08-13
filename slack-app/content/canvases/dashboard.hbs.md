## Project
- **Name:** {{projectName}}
- **Channel:** <#{{channelId}}>
- **Account:** {{accountDisplay}}
- **Salesforce Opportunity:** {{salesforceDisplay}}
- **Members:** {{membersDisplay}}
- **Notes:** {{notesDisplay}}
- **Status:** {{statusDisplay}}
{{#if showOnboardingLink}}

## Onboarding
⏳ **[Complete onboarding]({{onboardingLink}})** — fill in opportunity details to unlock the Requirements Agent.
{{/if}}
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
