## ADDED Requirements

### Requirement: Verification agent boundary

The slack-app SHALL orchestrate deliverable verification prompts and canvas synchronization. The agent-service SHALL own verification agent reasoning, proof formatting, and LLM invocation. The slack-app SHALL NOT generate delivery proof narrative content directly.

#### Scenario: Verification flow orchestration

- **GIVEN** a deliverable reaches **Validation required** or **Accepted**
- **WHEN** the slack-app invoke flow runs
- **THEN** the slack-app SHALL collect human proof input and Deliverables List row data
- **AND** the slack-app SHALL POST a verification request to agent-service using shared types from `packages/shared`
- **AND** the slack-app SHALL apply the returned proof block to the Requirements Canvas
- **AND** the slack-app SHALL NOT invoke an LLM for proof formatting directly

### Requirement: Proof block formatting contract

The Verification Agent SHALL produce markdown conforming to the `### Delivery Proof & Outcome` structure under the matching `REQ-XX` heading in the Requirements Canvas. The agent SHALL include Customer Summary, Visual Proof, Components, and Artefacts/Config subsections. The agent SHALL NOT invent visual proof URLs or screenshots. The agent SHALL NOT include credentials or secrets in Configuration.

#### Scenario: Visual proof link preserved

- **GIVEN** a verification input with a Loom video URL
- **WHEN** the agent formats the outcome block
- **THEN** the Visual Proof subsection SHALL contain the exact human-supplied Loom URL
- **AND** the Customer Summary SHALL provide a concise 2-sentence non-technical summary
