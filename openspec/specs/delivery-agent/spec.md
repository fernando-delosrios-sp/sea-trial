# Delivery Agent

## Purpose

LangGraph.js delivery agent that drafts and consolidates Delivery Template Canvas content from Deliverables List rows, onboarding suite components, and existing canvas markdown.

## Requirements

### Requirement: Delivery agent boundary

The slack-app SHALL orchestrate delivery consolidation. The agent-service SHALL own delivery agent reasoning and LLM invocation. The slack-app SHALL NOT generate delivery narrative content directly.

#### Scenario: Slack adapter responsibilities

- **GIVEN** a delivery consolidation is triggered (status change or manual action)
- **WHEN** the slack-app invoke flow runs
- **THEN** the slack-app SHALL load the Deliverables List row, linked canvas markdown, and onboarding suite components
- **AND** the slack-app SHALL POST a consolidation request to agent-service using shared types from `packages/shared`
- **AND** the slack-app SHALL apply the returned canvas markdown to the Delivery Template Canvas
- **AND** the slack-app SHALL NOT invoke an LLM for delivery content directly

#### Scenario: Agent-service responsibilities

- **GIVEN** a valid consolidation request from slack-app
- **WHEN** agent-service handles the request
- **THEN** agent-service SHALL run the delivery agent graph and return structured canvas markdown
- **AND** agent-service SHALL NOT require or use Slack bot tokens

### Requirement: Delivery consolidation input

The delivery agent SHALL accept a consolidation request containing at minimum: task ID, category, requirements, open questions, situation, assignee display name, SailPoint suite components, current canvas markdown (may be empty on first run), and draft version number.

#### Scenario: First draft from list row only

- **GIVEN** a consolidation request with no existing canvas markdown
- **WHEN** the delivery agent runs
- **THEN** the agent SHALL produce draft version 1 using list row and suite components as primary inputs

#### Scenario: Re-consolidation includes canvas content

- **GIVEN** a consolidation request with existing canvas markdown including human edits
- **WHEN** the delivery agent runs
- **THEN** the agent SHALL treat existing canvas prose as source material
- **AND** the agent SHALL re-write all standard sections per the delivery canvas template

### Requirement: Delivery section output contract

The delivery agent SHALL produce canvas markdown conforming to the Delivery canvas template section structure. The agent SHALL NOT invent visual proof URLs or screenshots. The agent SHALL NOT include credentials or secrets in Configuration. The agent SHALL preserve a manually edited Author value when present in the input canvas.

#### Scenario: Visual proof gap callout

- **GIVEN** a consolidation request where Visual proof contains no media or links
- **WHEN** the delivery agent runs
- **THEN** the Visual proof section SHALL include an explicit gap note
- **AND** the Customer summary SHALL note missing visual proof

#### Scenario: Configuration excludes secrets

- **GIVEN** a consolidation request referencing connector or tenant credentials
- **WHEN** the delivery agent runs
- **THEN** the Configuration section SHALL NOT contain secret values
- **AND** the Configuration section SHALL reference the Infrastructure canvas for secrets

#### Scenario: Author preserved when manually edited

- **GIVEN** a consolidation request where canvas metadata Author differs from the assignee snapshot
- **WHEN** the delivery agent runs
- **THEN** the output Author value SHALL match the input canvas Author
- **AND** the agent SHALL NOT reset Author to the list assignee

### Requirement: Draft version increment

Each successful consolidation SHALL increment the Draft version integer in canvas metadata and set a new generated timestamp.

#### Scenario: Draft version increments on consolidation

- **GIVEN** a canvas at draft version 2
- **WHEN** consolidation completes successfully
- **THEN** the output canvas metadata SHALL show draft version 3
- **AND** the generated timestamp SHALL reflect the consolidation time
