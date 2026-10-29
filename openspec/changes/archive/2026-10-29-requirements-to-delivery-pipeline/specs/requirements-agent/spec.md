## ADDED Requirements

### Requirement: Materials drop thread enforcement

The slack-app SHALL process document attachments only when posted to the pinned Materials & Requirements Drop thread, or when explicitly summoned via `@Sea Trial requirements` in that thread. Document attachments uploaded in general channel chatter SHALL NOT be automatically processed by the Requirements Agent; the bot MAY reply with instructions directing the user to the pinned Materials Drop thread.

#### Scenario: Document dropped in materials thread processes

- **GIVEN** onboarding is complete
- **WHEN** a user posts a specification file in the pinned Materials Drop thread
- **THEN** the Requirements Agent SHALL parse the document and update the Requirements Canvas

#### Scenario: Document in general channel chatter ignored

- **GIVEN** a message with a file attachment is posted in the channel outside the Materials Drop thread
- **AND** the message does not mention `@Sea Trial requirements`
- **WHEN** the message handler evaluates the event
- **THEN** the file SHALL NOT be parsed by agent-service
- **AND** the bot MAY post an ephemeral or thread reply directing uploads to the pinned thread

### Requirement: Plan deliverables canvas action link

The Requirements Canvas template and runtime renderer SHALL include a workflow link trigger (`[🚀 Plan Deliverables]({{planDeliverablesUrl}})`) enabling users to summon the Deliverables Agent to review requirements and generate the Deliverables List.

#### Scenario: Canvas contains plan deliverables action

- **GIVEN** a provisioned Requirements Canvas
- **WHEN** the canvas is rendered or updated with extracted requirements
- **THEN** the canvas header SHALL contain an action link referencing `planDeliverablesUrl`
- **AND** clicking the link SHALL trigger the Deliverables Agent workflow
