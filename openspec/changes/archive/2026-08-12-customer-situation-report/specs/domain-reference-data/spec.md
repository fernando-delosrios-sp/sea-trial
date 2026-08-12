## ADDED Requirements

### Requirement: Customer deliverable status bucket map

The slack-app SHALL store a mapping from internal deliverable statuses to customer-facing status buckets in `slack-app/content/domain/customer-deliverable-statuses.json`. Each entry SHALL include the internal status value, a stable customer bucket identifier, and a customer-facing label. The mapping SHALL collapse internal statuses into buckets: **In progress** (Not started, In progress), **Needs your input** (Blocked, Needs clarification), **In review** (Validation required), **Complete** (Accepted), and **Out of scope** (Not needed, Not doable).

#### Scenario: Customer status map loads successfully

- **GIVEN** `customer-deliverable-statuses.json` conforms to its schema
- **WHEN** the domain loader initializes
- **THEN** a typed accessor SHALL return the mapping for all eight internal statuses
- **AND** every internal status SHALL map to exactly one customer bucket

#### Scenario: Customer status ref registered in capability catalog

- **GIVEN** the capability catalog domain ref registry
- **WHEN** it is loaded
- **THEN** `@domain/customer-deliverable-statuses` SHALL map to `customer-deliverable-statuses.json`

## MODIFIED Requirements

### Requirement: Domain refs registered in capability catalog

Each `@domain/*` reference used by content compilers SHALL be registered in the capability catalog domain ref registry with a pointer to its source JSON file under `slack-app/content/domain/`.

#### Scenario: Deliverable statuses ref registered

- **GIVEN** the capability catalog domain ref registry
- **WHEN** it is loaded
- **THEN** `@domain/deliverable-statuses` SHALL map to `deliverable-statuses.json`

#### Scenario: SailPoint suites ref registered

- **GIVEN** the capability catalog domain ref registry
- **WHEN** it is loaded
- **THEN** `@domain/sailpoint-suites` SHALL map to `sailpoint-suites.json`

#### Scenario: Customer deliverable statuses ref registered

- **GIVEN** the capability catalog domain ref registry
- **WHEN** it is loaded
- **THEN** `@domain/customer-deliverable-statuses` SHALL map to `customer-deliverable-statuses.json`

#### Scenario: Unregistered ref not resolvable

- **GIVEN** content referencing `@domain/not-registered`
- **WHEN** validation or compilation runs
- **THEN** a descriptive error SHALL be thrown
