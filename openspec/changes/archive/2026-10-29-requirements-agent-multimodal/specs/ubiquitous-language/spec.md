## ADDED Requirements

### Requirement: Multimodal Document Pipeline term

The glossary SHALL define **Multimodal Document Pipeline** as the document parsing and extraction subsystem in `agent-service` that renders document pages and visual figures into image buffers alongside text to feed multimodal vision LLMs.

#### Scenario: Multimodal Document Pipeline term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** a Multimodal Document Pipeline term entry SHALL exist with definition, aliases, and notes

### Requirement: Source Provenance Tag term

The glossary SHALL define **Source Provenance Tag** as an explicit document origin identifier (e.g., `[PRD-v1.pdf]`) prefixed to each synthesized requirement in the Requirements Canvas markdown, enabling deterministic replacement or retraction when a source document is updated or discarded.

#### Scenario: Source Provenance Tag term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** a Source Provenance Tag term entry SHALL exist with definition, aliases, and notes

### Requirement: Requirements Proposal Gate term

The glossary SHALL define **Requirements Proposal Gate** as the Block Kit review interaction in the Slack invocation thread where the agent presents a summarized diff of candidate requirements and awaits explicit user acceptance (`[Accept & Update Canvas]`) before modifying the Requirements Canvas.

#### Scenario: Requirements Proposal Gate term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** a Requirements Proposal Gate term entry SHALL exist with definition, aliases, and notes

