## ADDED Requirements

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

---

## Term entries (delta)

### Term: Situation Report

**Context**: deliverables

**Definition**: Customer-facing Slack Canvas presenting periodic snapshots of Deliverables List state with executive summary, category-grouped detail (Task ID, customer status, Situation, Deliverable link, Open questions), and a compact changelog of prior publishes.

**Aliases**: situation report canvas, customer situation report

**Notes**: Published manually on demand; includes generation date; delivery excerpt placeholder until Delivery Template Canvas structure is defined.

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
