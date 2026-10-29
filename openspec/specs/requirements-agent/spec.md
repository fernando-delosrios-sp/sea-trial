# Requirements Agent

## Purpose

Document parsing, LangGraph.js Requirements Agent, Deno/agent-service boundary, and Requirements Canvas synchronization.

## Requirements

### Requirement: Deno and agent-service boundary

The slack-app SHALL act as a Slack adapter only. The agent-service SHALL own all
document parsing, agent reasoning, and LLM invocation. The slack-app SHALL NOT
parse documents or call an LLM.

#### Scenario: Slack adapter responsibilities

- **GIVEN** a user invokes the Requirements Agent via @mention
- **WHEN** the slack-app invoke flow runs
- **THEN** the slack-app SHALL load `TesEventContext`, Requirements canvas, and deliverables from Slack
- **AND** the slack-app SHALL download file attachments from Slack as raw bytes
- **AND** the slack-app SHALL POST a request to agent-service using shared types from `packages/shared`
- **AND** the slack-app SHALL apply the response (canvas update, Block Kit proposals)
- **AND** the slack-app SHALL NOT invoke an LLM, parse documents, or enforce TES agent rules directly

#### Scenario: Agent-service responsibilities

- **GIVEN** a valid process request from slack-app
- **WHEN** agent-service handles the request
- **THEN** agent-service SHALL parse documents, run the LangGraph agent, and apply TES rules
- **AND** agent-service SHALL return structured JSON (canvas markdown, proposals, message, clarification flag)
- **AND** agent-service SHALL NOT require or use Slack bot tokens

### Requirement: Document parser pipeline

The agent-service SHALL parse uploaded documents in supported formats using Node.js
TypeScript parser libraries in `agent-service/src/parsers/`. Supported MVP formats
are text-based PDF, DOCX, XLSX, and plain text. The slack-app SHALL send raw file
bytes; the agent-service SHALL perform all extraction. Unsupported formats and
image-only PDFs SHALL be rejected gracefully without unhandled exceptions.

#### Scenario: Supported format parsing

- **GIVEN** an uploaded text-based PDF, DOCX, XLSX, or plain text file
- **WHEN** `parseDocument` is invoked with the file buffer
- **THEN** extracted text SHALL be returned with `supported: true`
- **AND** the result SHALL include filename and mimeType

#### Scenario: Unsupported format handling

- **GIVEN** an uploaded file in an unsupported format
- **WHEN** `parseDocument` is invoked
- **THEN** the result SHALL have `supported: false` and a human-readable error message
- **AND** the parser SHALL NOT throw an unhandled exception

#### Scenario: Image-only PDF rejection

- **GIVEN** an uploaded PDF with no selectable text layer (image-only or scanned)
- **WHEN** `parseDocument` is invoked
- **THEN** the result SHALL have `supported: false` and an error message indicating the PDF contains no extractable text
- **AND** the parser SHALL NOT throw an unhandled exception

#### Scenario: Parsed document recorded in canvas

- **GIVEN** one or more files were processed in an agent run
- **WHEN** the agent updates the Requirements Canvas
- **THEN** the "Documents processed" section SHALL list each file with its parse status (success or error message)

### Requirement: Requirements Agent graph

The agent-service SHALL expose a LangGraph.js Requirements Agent with distinct nodes
for context loading, format parsing, semantic analysis, clarification, and output
formatting. The graph nodes SHALL be: `loadContext`, `parseDocuments`,
`analyzeRequirements`, `clarifyOrPropose`, and `formatOutput`.

#### Scenario: Process requirements endpoint

- **GIVEN** a valid `TesEventContext`, requirements canvas markdown, existing deliverables, and files
- **WHEN** POST `/agents/requirements/process` is called
- **THEN** the response SHALL include updated canvas markdown, proposals, agent message, and clarification flag

#### Scenario: Graph node execution order

- **GIVEN** a process request with file attachments
- **WHEN** the Requirements Agent graph executes
- **THEN** `parseDocuments` SHALL run before `analyzeRequirements`
- **AND** `formatOutput` SHALL run after `clarifyOrPropose`

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

### Requirement: Raw byte file transport

The slack-app SHALL send uploaded files to agent-service as raw bytes without
format pre-processing. The agent-service SHALL perform all format extraction.

#### Scenario: Slack app sends raw bytes

- **GIVEN** a user @mentions the bot with file attachments
- **WHEN** the slack-app builds the agent-service request
- **THEN** each file SHALL be included as a `FilePayload` with filename, mimeType, and raw content (base64-encoded or equivalent)
- **AND** the slack-app SHALL NOT import or invoke document parser libraries

#### Scenario: Agent-service receives bytes for parsing

- **GIVEN** a process request containing `FilePayload[]` with raw file content
- **WHEN** agent-service handles the request
- **THEN** the `parseDocuments` graph node SHALL invoke `parseDocument()` on each file buffer
- **AND** extracted text SHALL be passed to downstream semantic analysis nodes

### Requirement: Format vs semantic parsing separation

The agent-service SHALL separate format extraction (deterministic, no LLM) from
semantic requirement analysis (LLM-driven). Format parsing SHALL occur in the
`parseDocuments` LangGraph node; semantic analysis SHALL occur in `analyzeRequirements`
and downstream nodes.

#### Scenario: Format parsing without LLM

- **GIVEN** a file buffer for a supported format
- **WHEN** the `parseDocuments` node runs
- **THEN** `parseDocument()` SHALL extract plain text without invoking an LLM
- **AND** the result SHALL conform to the `ParsedDocument` shared type

#### Scenario: Semantic analysis after format extraction

- **GIVEN** one or more successfully parsed documents with extracted text
- **WHEN** the `analyzeRequirements` node runs
- **THEN** an LLM SHALL analyze the text against canvas state and TesEventContext scope
- **AND** format parsing logic SHALL NOT be duplicated in semantic nodes

### Requirement: Slack-native MVP memory

The Requirements Agent SHALL use Slack-native objects as its sole memory store for
MVP. The agent SHALL NOT depend on external vector databases or memory services
(qdrant, supermemory, gbrain) for retrieval.

#### Scenario: Task memory from Requirements Canvas

- **GIVEN** a prior agent session has updated the Requirements Canvas
- **WHEN** the agent is re-invoked
- **THEN** the slack-app SHALL pass the full Requirements Canvas markdown in the request
- **AND** the agent SHALL extend prior content without requiring external retrieval

#### Scenario: No external memory dependency

- **GIVEN** the Requirements Agent processes a request
- **WHEN** the agent loads context and analyzes documents
- **THEN** the agent SHALL NOT query an external vector store or memory API
- **AND** all context SHALL come from the HTTP request payload (TesEventContext, canvas, deliverables, files)

---

### Requirement: Requirements Canvas synchronization

The agent-service SHALL update Requirements Canvas markdown incrementally, preserving prior session content and replacing updatable sections in place.

#### Scenario: Out of Scope section updated on subsequent run

- **GIVEN** existing Requirements Canvas markdown containing a `## Out of Scope` section
- **WHEN** the agent processes new documents and identifies out-of-scope items
- **THEN** the canvas SHALL contain exactly one `## Out of Scope` section header
- **AND** the section SHALL reflect the latest out-of-scope items from the current run

#### Scenario: Out of Scope section created on first run

- **GIVEN** Requirements Canvas markdown without a `## Out of Scope` section
- **WHEN** the agent identifies out-of-scope items
- **THEN** the canvas SHALL append a new `## Out of Scope` section with the identified items

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
