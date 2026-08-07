## MODIFIED Requirements

### Requirement: Slack app agent invocation

The slack-app SHALL wire @mention handling to the agent-service with gate checks and canvas sync. The agent SHALL only run when explicitly summoned by a user @mention (or thread continuation); it SHALL NOT auto-run on channel provisioning or onboarding completion.

#### Scenario: Successful agent run

- **GIVEN** onboarding is complete and a user @mentions the bot with file attachments
- **WHEN** the invoke flow runs
- **THEN** files SHALL be downloaded and sent to agent-service
- **AND** the Requirements canvas SHALL be updated with agent output
- **AND** proposals SHALL be posted in a Block Kit thread

#### Scenario: Multi-turn thread continuation

- **GIVEN** an existing agent proposal thread
- **WHEN** a user replies in the thread
- **THEN** the agent SHALL be re-invoked with updated context and canvas state

#### Scenario: Summon-only invocation

- **GIVEN** a TES Event Channel is created or onboarding completes
- **WHEN** no user @mentions the bot
- **THEN** the invoke flow SHALL NOT run
