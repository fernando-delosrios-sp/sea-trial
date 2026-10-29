## ADDED Requirements

### Requirement: Staged requirements proposal review gate

The slack-app and agent-service SHALL gate Requirements Canvas updates behind an explicit user review action in the Slack invocation thread. When new documents or refinement requests are processed, the agent-service SHALL return a summarized requirements proposal, and the slack-app SHALL present an `[Accept & Update Canvas]` Block Kit action. The slack-app SHALL NOT update the Requirements Canvas until the user explicitly accepts the proposal.

#### Scenario: Proposal presented in thread before canvas edit

- **GIVEN** onboarding is complete and a user uploads specification documents to the Materials Drop thread
- **WHEN** the Requirements Agent completes analysis
- **THEN** the slack-app SHALL post a proposal summary in the invocation thread with an `[Accept & Update Canvas]` action button
- **AND** the slack-app SHALL NOT modify the Requirements Canvas markdown at this stage

#### Scenario: Canvas updated upon user acceptance

- **GIVEN** a pending requirements proposal in the invocation thread
- **WHEN** the user clicks `[Accept & Update Canvas]`
- **THEN** the slack-app SHALL apply the proposed markdown to the Requirements Canvas via the Canvas Edit API
- **AND** the proposal message SHALL update to confirm acceptance

#### Scenario: Refinement via thread reply

- **GIVEN** a pending requirements proposal in the invocation thread
- **WHEN** a user replies in the thread with feedback or tweaks
- **THEN** the agent-service SHALL re-analyze the feedback against the current proposal
- **AND** the slack-app SHALL update the thread proposal summary with the revised requirements

---

## MODIFIED Requirements

### Requirement: Document parser pipeline

The agent-service SHALL parse uploaded documents in supported formats using Node.js parser and rendering libraries in `agent-service/src/parsers/`. Supported formats SHALL include text-based and image-based PDF, DOCX, XLSX, plain text, Markdown, and common image formats (PNG, JPEG). The slack-app SHALL send raw file bytes; the agent-service SHALL perform all extraction. For PDF and image-containing documents, the pipeline SHALL render pages and visual figures into image buffers for multimodal vision LLM analysis. Unsupported formats or corrupt files SHALL be rejected gracefully without unhandled exceptions.

#### Scenario: Supported format parsing

- **GIVEN** an uploaded PDF, DOCX, XLSX, TXT, MD, or image file (PNG/JPEG)
- **WHEN** `parseDocument` is invoked with the file buffer
- **THEN** extracted text and/or page image buffers SHALL be returned with `supported: true`
- **AND** the result SHALL include filename and mimeType

#### Scenario: Unsupported format handling

- **GIVEN** an uploaded file in an unsupported format
- **WHEN** `parseDocument` is invoked
- **THEN** the result SHALL have `supported: false` and a human-readable error message
- **AND** the parser SHALL NOT throw an unhandled exception

#### Scenario: Image-only PDF rejection

- **GIVEN** an uploaded image-only or scanned PDF that is corrupt or whose visual pages cannot be rendered
- **WHEN** `parseDocument` is invoked
- **THEN** the result SHALL have `supported: false` and an error message indicating extraction failure
- **AND** the parser SHALL NOT throw an unhandled exception

#### Scenario: Scanned and image-rich PDF parsing

- **GIVEN** an uploaded PDF containing scanned pages or embedded diagrams
- **WHEN** `parseDocument` is invoked
- **THEN** document pages SHALL be rendered to image buffers with `supported: true`
- **AND** forwarded to the multimodal vision analysis node

#### Scenario: Parsed document recorded in canvas

- **GIVEN** one or more files were processed in an agent run
- **WHEN** the agent updates the Requirements Canvas
- **THEN** the "Documents processed" section SHALL list each file with its parse status (success or error message)

---

### Requirement: Requirements Canvas synchronization

The agent-service SHALL update Requirements Canvas markdown incrementally, preserving prior session content and replacing updatable sections in place. Each synthesized requirement SHALL be prefixed with a source provenance tag (`[filename.ext]`). When a revised document is processed, prior requirements tagged with that document name SHALL be superseded or updated.

#### Scenario: Out of Scope section updated on subsequent run

- **GIVEN** existing Requirements Canvas markdown containing a `## Out of Scope` section
- **WHEN** the agent processes new documents and identifies out-of-scope items
- **THEN** the canvas SHALL contain exactly one `## Out of Scope` section header
- **AND** the section SHALL reflect the latest out-of-scope items from the current run

#### Scenario: Out of Scope section created on first run

- **GIVEN** Requirements Canvas markdown without a `## Out of Scope` section
- **WHEN** the agent identifies out-of-scope items
- **THEN** the canvas SHALL append a new `## Out of Scope` section with the identified items

#### Scenario: Source provenance tagging on requirements

- **GIVEN** requirements extracted from an uploaded document named `Architecture_Overview.pdf`
- **WHEN** the Requirements Canvas is updated
- **THEN** each extracted requirement bullet SHALL include the source provenance tag `[Architecture_Overview.pdf]`

#### Scenario: Document revision supersedes previous requirements

- **GIVEN** existing canvas requirements tagged with `[Architecture_v1.pdf]`
- **WHEN** an updated file `Architecture_v2.pdf` is uploaded as a revision
- **THEN** the agent SHALL propose superseding the requirements tagged with `[Architecture_v1.pdf]`
- **AND** upon acceptance, the canvas SHALL reflect the updated requirements tagged with `[Architecture_v2.pdf]`
