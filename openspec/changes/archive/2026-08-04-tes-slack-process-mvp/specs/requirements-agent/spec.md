# Requirements Agent

Delta for initial MVP implementation. Mirrors requirements in `openspec/specs/requirements-agent/spec.md`.

## ADDED Requirements

### Requirement: Deno and agent-service boundary

The slack-app SHALL act as a Slack adapter only. The agent-service SHALL own all agent
reasoning and SHALL NOT call Slack APIs or hold Slack tokens.

#### Scenario: Slack adapter responsibilities

- **GIVEN** a user invokes the Requirements Agent via @mention
- **WHEN** the slack-app invoke flow runs
- **THEN** the slack-app SHALL load `TesEventContext`, Requirements canvas, and deliverables from Slack
- **AND** the slack-app SHALL download file attachments from Slack
- **AND** the slack-app SHALL POST a request to agent-service using shared types from `packages/shared`
- **AND** the slack-app SHALL apply the response (canvas update, Block Kit proposals)
- **AND** the slack-app SHALL NOT invoke an LLM or enforce TES agent rules directly

#### Scenario: Agent-service responsibilities

- **GIVEN** a valid process request from slack-app
- **WHEN** agent-service handles the request
- **THEN** agent-service SHALL parse documents, run the LangGraph agent, and apply TES rules
- **AND** agent-service SHALL return structured JSON (canvas markdown, proposals, message, clarification flag)
- **AND** agent-service SHALL NOT require or use Slack bot tokens

### Requirement: Document parser pipeline

The agent-service SHALL parse uploaded documents in supported formats and reject
unsupported formats gracefully. Parser libraries and whether slack-app sends raw bytes
vs pre-processed content are implementation decisions (deferred).

#### Scenario: Supported format parsing

- **GIVEN** an uploaded PDF, DOCX, XLSX, or plain text file
- **WHEN** `parseDocument` is invoked
- **THEN** extracted text SHALL be returned with `supported: true`

#### Scenario: Unsupported format handling

- **GIVEN** an uploaded file in an unsupported format
- **WHEN** `parseDocument` is invoked
- **THEN** the result SHALL have `supported: false` and an error message
- **AND** the parser SHALL NOT throw an unhandled exception

### Requirement: Requirements Agent graph

The agent-service SHALL expose a LangGraph.js Requirements Agent that processes context,
documents, and existing canvas state to produce proposals.

#### Scenario: Process requirements endpoint

- **GIVEN** a valid `TesEventContext`, requirements canvas markdown, existing deliverables, and files
- **WHEN** POST `/agents/requirements/process` is called
- **THEN** the response SHALL include updated canvas markdown, proposals, agent message, and clarification flag

#### Scenario: No-merge rule enforcement

- **GIVEN** input documents containing two explicitly distinct deliverables
- **WHEN** the agent processes them
- **THEN** two separate proposals SHALL be returned
- **AND** similarity notes MAY be added but deliverables MUST NOT be merged

#### Scenario: Out-of-scope rejection

- **GIVEN** requirements referencing suite components outside the derived scope
- **WHEN** the agent analyzes them
- **THEN** out-of-scope items SHALL be flagged and not promoted as deliverables

#### Scenario: Clarification path

- **GIVEN** vague or incomplete input documents
- **WHEN** the agent cannot extract actionable requirements
- **THEN** clarification questions SHALL be returned with `needsClarification: true`

### Requirement: Slack app agent invocation

The slack-app SHALL wire @mention handling to the agent-service with gate checks and canvas sync.

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

### Requirement: Requirements Canvas session continuity

The Requirements Agent SHALL extend the Requirements Canvas across sessions without overwriting prior work.

#### Scenario: Second session extends canvas

- **GIVEN** a Requirements Canvas with content from a prior agent session
- **WHEN** a user uploads new documents and invokes the agent
- **THEN** prior extracted requirements and session log entries SHALL be preserved
- **AND** new content SHALL be appended or merged into the appropriate sections
