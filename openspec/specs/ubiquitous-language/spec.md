# Ubiquitous Language

## Purpose

Shared domain vocabulary for Sea Trial. All specs, design docs, code identifiers,
and user-facing copy MUST align with the terms defined here.
## Requirements
### Requirement: Glossary maintenance

The project SHALL maintain an authoritative glossary of domain terms with unambiguous
definitions, preferred spellings, and known aliases.

#### Scenario: New term introduced in a change

- **GIVEN** a change proposal introduces a new domain concept or renames an existing one
- **WHEN** the change is approved for implementation
- **THEN** the term MUST be added or updated in this spec before the change archives

#### Scenario: Term used in a spec

- **GIVEN** a capability spec references a domain noun or verb
- **WHEN** the term is not yet defined in this glossary
- **THEN** the author MUST add the definition here or reuse an existing term instead

### Requirement: Consistent naming

Implementation artifacts (types, functions, API fields, Slack labels) SHALL use glossary terms verbatim unless a documented alias applies.

#### Scenario: Code review against glossary

- **GIVEN** an implementation uses a domain label visible to other systems or users
- **WHEN** the label differs from the glossary preferred spelling without an alias entry
- **THEN** the implementation MUST be corrected or the glossary MUST be updated first

---

### Requirement: Bounded context boundaries

When the same word means different things in different areas, each meaning MUST be
listed as a separate entry with its bounded context noted.

#### Scenario: Homonym disambiguation

- **GIVEN** two subsystems use the same word with different meanings
- **WHEN** both meanings appear in specs or code
- **THEN** each meaning MUST have its own glossary entry naming the bounded context

### Requirement: Account term

The project SHALL use **Account** as the preferred user-facing and glossary term for the customer or prospect identity associated with a TES Event Channel.

#### Scenario: Account label in creation modal

- **GIVEN** a user opens the Create TES Event creation modal
- **WHEN** the modal is displayed
- **THEN** the identity field SHALL be labeled Account (not Customer or Prospect)

#### Scenario: Account in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** an Account term entry SHALL exist with definition and bounded context

### Requirement: Situation Report term

The glossary SHALL define **Situation Report** as a customer-facing Slack Canvas presenting periodic snapshots of Deliverables List state.

#### Scenario: Situation Report term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** a Situation Report term entry SHALL exist with definition, aliases, and notes

### Requirement: Customer deliverable status bucket term

The glossary SHALL define **Customer deliverable status bucket** as one of five collapsed customer-facing states derived from internal Deliverable Status.

#### Scenario: Customer status bucket term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** a Customer deliverable status bucket term entry SHALL list all five buckets

### Requirement: Situation Report publish term

The glossary SHALL define **Situation Report publish** as the manual action that rotates current snapshot into changelog and writes a new customer-facing report from the Deliverables List.

#### Scenario: Publish term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** a Situation Report publish term entry SHALL describe manual on-demand behavior

### Requirement: Delivery draft term

The glossary SHALL define **Delivery draft** as agent-generated Delivery Template Canvas content marked with a review flag until a human clears it via Mark reviewed.

#### Scenario: Delivery draft term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** a Delivery draft term entry SHALL exist with definition, aliases, and notes including draft version increment semantics

### Requirement: Consolidation term

The glossary SHALL define **Consolidation** as a delivery agent run that reads the Deliverables List row and current canvas markdown and re-writes standard sections to produce an updated delivery draft.

#### Scenario: Consolidation term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** a Consolidation term entry SHALL describe automatic Validation required and manual Consolidate draft triggers

### Requirement: Customer summary term

The glossary SHALL define **Customer summary** as the customer-facing H2 section in the Delivery Template Canvas that is the sole source for Situation Report delivery excerpt.

#### Scenario: Customer summary term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** a Customer summary term entry SHALL note 500-character excerpt cap and optional hero proof link

### Requirement: Review flag term

The glossary SHALL define **Review flag** as canvas-level banner and per-section markers indicating agent-generated content pending human review, cleared only by Mark reviewed.

#### Scenario: Review flag term in glossary

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** a Review flag term entry SHALL note reappearance after each consolidation run

### Requirement: Delivery Template Canvas term

The glossary SHALL update **Delivery Template Canvas** to reflect Validation-required creation, delivery agent consolidation, and Customer summary as Situation Report excerpt source.

#### Scenario: Delivery Template Canvas term updated on archive

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** the Delivery Template Canvas term SHALL note creation at Validation required, not on Accept
- **AND** the term SHALL reference Customer summary as excerpt source

---

## Term entries

### Term: Sea Trial
**Context**: global
**Definition**: The Slack-native platform (repository `sea-trial`, npm scope `@sea-trial/*`) that provisions TES Event Channels, runs onboarding, and hosts the Requirements Agent.
**Aliases**: sea-trial
**Notes**: Slack app display name is "Sea Trial". Domain concepts (TES Event Channel, TesEventContext) refer to the business process, not the platform name.

### Term: TES Event Channel
**Context**: event-channel
**Definition**: A Slack channel provisioned for a TES engagement, named `#proj-{custom-name}-tes`, containing seeded canvases, lists, and pinned index.
**Aliases**: TES channel, event channel
**Notes**: Created via the "Create TES Event" global shortcut.

### Term: Dashboard Canvas
**Context**: event-channel
**Definition**: The event hub canvas holding onboarding data, stakeholders, dates, status, and the `TesEventContext` metadata block.
**Aliases**: dashboard
**Notes**: Stores object IDs in a JSON metadata block at the bottom.

### Term: Requirements Canvas
**Context**: requirements-agent
**Definition**: Living requirement memory maintained by the Requirements Agent between sessions; sections include Scope, Documents processed, Extracted requirements, Deliverable candidates, Analysis notes, Open questions, Session log.
**Aliases**: requirements canvas
**Notes**: Agent updates this; must not overwrite prior work across sessions.

### Term: Deliverables List
**Context**: deliverables
**Definition**: Slack List tracking accepted delivery items with core fields: Task ID, Assignee, Status, Situation, Category, Requirements, Due date, Deliverable (canvas link), Open questions.
**Aliases**: deliverables list
**Notes**: Rows are written only after explicit user acceptance via the review gate.

### Term: Deliverable Status
**Context**: deliverables
**Definition**: One of eight exact statuses: Not started, Not needed, Not doable, In progress, Blocked, Validation required, Accepted, Needs clarification.
**Aliases**: status
**Notes**: Must match exactly in code and Slack UI.

### Term: TesEventContext
**Context**: global
**Definition**: Canonical shared type holding channel ID, project name, onboarding state, derived components, and IDs for all seeded Slack objects including the Situation Report canvas.
**Aliases**: event context
**Notes**: Defined in `packages/shared`; persisted in Dashboard canvas metadata.

### Term: Onboarding
**Context**: onboarding
**Definition**: AE/SE modal flow collecting customer context, SailPoint suite selection, and stakeholders; completion sets `onboardingComplete: true` and opens the agent gate.
**Aliases**: onboarding form
**Notes**: Triggered via pinned index button or `/tes-onboard`.

### Term: Agent Gate
**Context**: onboarding
**Definition**: Guard that blocks Requirements Agent invocation until onboarding is complete (SailPoint suite selected).
**Aliases**: onboarding gate
**Notes**: Enforced in slack-app before calling agent-service.

### Term: Review Gate
**Context**: deliverables
**Definition**: User-facing Accept/Edit/Reject flow on agent proposals; Deliverables List writes occur only on Accept.
**Aliases**: acceptance gate, write gate
**Notes**: Agent MUST NOT write to Deliverables List without explicit acceptance.

### Term: Requirements Agent
**Context**: requirements-agent
**Definition**: LangGraph.js agent in agent-service that parses documents, extracts requirements, proposes deliverables, and updates the Requirements Canvas.
**Aliases**: agent
**Notes**: Invoked via HTTP POST `/agents/requirements/process`.

### Term: Deliverable Proposal
**Context**: requirements-agent
**Definition**: Structured agent output proposing a deliverable candidate with task ID, category, requirements, source doc ref, similarity notes, suggested status, and open questions.
**Aliases**: proposal
**Notes**: Displayed in Block Kit thread; promoted to list only via review gate.

### Term: Delivery Template Canvas
**Context**: deliverables
**Definition**: Canvas created when a deliverables list row reaches Validation required, structured per `delivery.hbs.md`, maintained by humans and the delivery agent via consolidation, and linked in the Deliverables List Deliverable field.
**Aliases**: delivery canvas
**Notes**: Not created on Accept. Customer summary section feeds Situation Report excerpt.

### Term: Delivery draft
**Context**: deliverables
**Definition**: Agent-generated Delivery Template Canvas content produced by the delivery agent, marked with a review flag until a human clears it via Mark reviewed.
**Aliases**: agent draft
**Notes**: Draft version integer increments on each consolidation run.

### Term: Consolidation
**Context**: deliverables
**Definition**: A delivery agent run that reads the Deliverables List row and current canvas markdown and re-writes standard sections to produce an updated delivery draft.
**Aliases**: consolidate draft
**Notes**: Triggered automatically on first Validation required transition or manually via Consolidate draft action.

### Term: Customer summary
**Context**: deliverables
**Definition**: Customer-facing H2 section in the Delivery Template Canvas synthesized by the delivery agent from business value, visual proof, components, and technologies; sole source for Situation Report delivery excerpt.
**Aliases**: delivery excerpt source
**Notes**: Extraction applies 500-character soft cap and optional hero proof link.

### Term: Review flag
**Context**: deliverables
**Definition**: Canvas-level banner and per-section markers indicating agent-generated content pending human review; cleared only by Mark reviewed action.
**Aliases**: agent review flag, pending review
**Notes**: Reappears after each consolidation run.

### Term: No-merge Rule
**Context**: requirements-agent
**Definition**: Agent integrity rule: explicit deliverables in input documents MUST be preserved 1:1; the agent adds similarity analysis notes but MUST NOT merge distinct deliverables.
**Aliases**: deliverable integrity
**Notes**: Covered by automated agent tests.

### Term: SailPoint Suite
**Context**: onboarding
**Definition**: Product suite selected during onboarding (e.g., Identity Security Cloud) used to derive technical components via static mapping.
**Aliases**: suite
**Notes**: Mapped in `slack-app/lib/suite-components.ts`.

### Term: Situation Report
**Context**: deliverables
**Definition**: Customer-facing Slack Canvas presenting periodic snapshots of Deliverables List state with executive summary, category-grouped detail (Task ID, customer status, Situation, Deliverable link, Open questions), and a compact changelog of prior publishes.
**Aliases**: situation report canvas, customer situation report
**Notes**: Published manually on demand; includes generation date; delivery excerpt sourced from Delivery Template Canvas Customer summary when reviewed.

### Term: Customer deliverable status bucket
**Context**: deliverables
**Definition**: One of five collapsed customer-facing states derived from internal Deliverable Status: In progress, Needs your input, In review, Complete, Out of scope. Mapping defined in `customer-deliverable-statuses.json`.
**Aliases**: customer status, customer-facing status
**Notes**: Internal eight-value status vocabulary remains on the Deliverables List unchanged.

### Term: Situation Report publish
**Context**: deliverables
**Definition**: Manual action that reads Deliverables List rows, maps statuses to customer buckets, writes a new Current situation to the Situation Report canvas, sets Generated date, and appends the prior snapshot as a Changelog row.
**Aliases**: publish situation report
**Notes**: Does not modify list rows; does not run on a schedule at MVP.
