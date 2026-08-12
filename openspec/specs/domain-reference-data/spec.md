# domain-reference-data Specification

## Purpose
TBD - created by archiving change domain-content-json. Update Purpose after archive.
## Requirements
### Requirement: Domain JSON files

The slack-app SHALL store domain reference data as versioned JSON files under `slack-app/content/domain/`.

#### Scenario: SailPoint suites file exists

- **GIVEN** the slack-app content layer is deployed
- **WHEN** `sailpoint-suites.json` is loaded
- **THEN** it SHALL contain a mapping from suite name to component module list
- **AND** the mapping SHALL include "Identity Security Cloud", "IdentityIQ", and "IdentityNow"

#### Scenario: Deliverable statuses file exists

- **GIVEN** the slack-app content layer is deployed
- **WHEN** `deliverable-statuses.json` is loaded
- **THEN** it SHALL contain a list of status choice objects with `value` and `label` fields
- **AND** each `value` SHALL equal its `label`

---

### Requirement: Domain loader with schema validation

The slack-app SHALL load domain JSON via `lib/content/domain.ts` with JSON Schema validation at load time.

#### Scenario: Valid domain files load successfully

- **GIVEN** domain JSON files conform to their schemas
- **WHEN** the domain loader initializes
- **THEN** typed accessors SHALL return suite names, component lists, and status choices
- **AND** no validation error SHALL be thrown

#### Scenario: Invalid domain file fails validation

- **GIVEN** a domain JSON file violates its schema
- **WHEN** the domain loader attempts to parse it
- **THEN** a descriptive validation error SHALL be thrown

---

### Requirement: Shared type sync tests

The slack-app SHALL enforce parity between domain JSON and `packages/shared` TypeScript types via automated tests.

#### Scenario: Deliverable status parity

- **GIVEN** `deliverable-statuses.json` values and the `DeliverableStatus` union type
- **WHEN** sync tests run
- **THEN** every JSON status value SHALL be a valid `DeliverableStatus`
- **AND** every `DeliverableStatus` variant SHALL appear in the JSON file

#### Scenario: Suite key stability

- **GIVEN** `sailpoint-suites.json` suite keys
- **WHEN** sync tests run
- **THEN** `getSupportedSuites()` SHALL return exactly those keys
- **AND** `deriveComponents` for each key SHALL return the JSON-defined component list

---

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

---

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

