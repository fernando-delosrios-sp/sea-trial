## MODIFIED Requirements

### Requirement: Deliverable list schema

Deliverables List rows SHALL use the mandatory core fields. The list column schema SHALL be defined in `slack-app/content/lists/deliverables.json` with stable column `key` values. Status select options SHALL reference `@domain/deliverable-statuses`.

#### Scenario: Core fields populated

- **GIVEN** a user accepts a deliverable proposal
- **WHEN** the list row is created
- **THEN** Task ID, Assignee, Status, Situation, Category, Requirements, Due date, and Deliverable fields SHALL be populated per schema
