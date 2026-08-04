## ADDED Requirements

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
