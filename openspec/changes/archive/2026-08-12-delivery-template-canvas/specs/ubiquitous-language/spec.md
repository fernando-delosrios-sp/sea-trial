## ADDED Requirements

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

---

## Term entries (delta)

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

## MODIFIED Requirements

### Requirement: Delivery Template Canvas term

The glossary SHALL update **Delivery Template Canvas** to reflect Validation-required creation, delivery agent consolidation, and Customer summary as Situation Report excerpt source.

#### Scenario: Delivery Template Canvas term updated on archive

- **GIVEN** this change archives
- **WHEN** the ubiquitous-language spec is updated
- **THEN** the Delivery Template Canvas term SHALL note creation at Validation required, not on Accept
- **AND** the term SHALL reference Customer summary as excerpt source

---

## Term entry (modified)

### Term: Delivery Template Canvas

**Context**: deliverables

**Definition**: Canvas created when a deliverables list row reaches Validation required, structured per `delivery.hbs.md`, maintained by humans and the delivery agent via consolidation, and linked in the Deliverables List Deliverable field.

**Aliases**: delivery canvas

**Notes**: Not created on Accept. Customer summary section feeds Situation Report excerpt.

### Term: Situation Report

**Context**: deliverables

**Definition**: Customer-facing Slack Canvas presenting periodic snapshots of Deliverables List state with executive summary, category-grouped detail (Task ID, customer status, Situation, Deliverable link, Open questions), and a compact changelog of prior publishes.

**Aliases**: situation report canvas, customer situation report

**Notes**: Published manually on demand; includes generation date; delivery excerpt sourced from Delivery Template Canvas Customer summary when reviewed.
