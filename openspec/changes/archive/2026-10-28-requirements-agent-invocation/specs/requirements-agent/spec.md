## MODIFIED Requirements

### Requirement: Slack app agent invocation

The slack-app SHALL wire agent invocation to the agent-service with onboarding gate checks, multi-agent sub-command dispatch, Materials Drop thread detection, and canvas sync. The Requirements Agent SHALL run when summoned by a user @mention with the explicit `requirements` sub-command, when files or replies are posted to the pinned Materials Drop thread, or during multi-turn thread continuation. The agent SHALL NOT auto-run on channel provisioning or onboarding completion. The slack-app SHALL ignore general channel chatter that does not target the agent or the Materials Drop thread without invoking the agent-service.

#### Scenario: Successful agent run

- **GIVEN** onboarding is complete and a user @mentions the bot with the `requirements` sub-command and file attachments
- **WHEN** the invoke flow runs
- **THEN** files SHALL be downloaded and sent to agent-service
- **AND** the Requirements canvas SHALL be updated with agent output
- **AND** proposals SHALL be posted in a Block Kit thread

#### Scenario: Successful agent run via Materials Drop thread

- **GIVEN** onboarding is complete and a user posts a file attachment to the pinned Materials Drop thread
- **WHEN** the invoke flow runs
- **THEN** files SHALL be downloaded and sent to agent-service
- **AND** the Requirements canvas SHALL be updated with agent output
- **AND** proposals SHALL be posted in the Materials Drop thread with Accept, Edit, and Reject actions

#### Scenario: Multi-turn thread continuation

- **GIVEN** an existing agent proposal thread
- **WHEN** a user replies in the thread
- **THEN** the agent SHALL be re-invoked with updated context and canvas state

#### Scenario: Summon-only invocation

- **GIVEN** a TES Event Channel is created or onboarding completes
- **WHEN** no user @mentions the bot and no file is posted to the Materials Drop thread
- **THEN** the invoke flow SHALL NOT run

#### Scenario: Multi-agent sub-command routing

- **GIVEN** a user mentions `@Sea Trial` without a recognized sub-command
- **WHEN** the router evaluates the message
- **THEN** the app SHALL reply with usage guidance listing available sub-commands (`requirements`, `delivery`)
- **AND** the app SHALL NOT call agent-service

#### Scenario: General chatter fast-exit

- **GIVEN** a message is posted in the channel outside the Materials Drop thread and without mentioning `@Sea Trial`
- **WHEN** the channel message trigger evaluates the event
- **THEN** the flow SHALL exit immediately without posting messages or invoking agent-service
