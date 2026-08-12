# content-capability-catalog Specification

## Purpose
Versioned capability catalog defining valid Slack-native component types, properties, and TES extensions per content surface, driving IDE JSON Schema and compile-time validation.

## Requirements

### Requirement: Capability catalog per content surface

The slack-app SHALL maintain a versioned capability catalog under `slack-app/schemas/content/capabilities/` defining valid component types, allowed properties, forbidden properties, and TES extensions for each content surface: modal, list, message, and canvas.

#### Scenario: Modal element types documented in catalog

- **GIVEN** the capability catalog is loaded
- **WHEN** an author inspects modal input element types
- **THEN** every Slack-documented Block Kit input `element.type` SHALL be listed with its allowed properties
- **AND** each listed type SHALL be valid for compilation without TES subset restrictions

#### Scenario: List column types documented in catalog

- **GIVEN** the capability catalog is loaded
- **WHEN** an author inspects list column types
- **THEN** every Slack-documented Lists `column.type` SHALL be listed with its allowed `options` shape
- **AND** rules for when `options_ref` is permitted SHALL be explicit

#### Scenario: Message Block Kit blocks documented in catalog

- **GIVEN** the capability catalog is loaded
- **WHEN** an author inspects message template block types
- **THEN** every Slack-documented Block Kit block type for messages SHALL be listed with its allowed properties

---

### Requirement: Slack-native list select options shape

List select and multi_select columns in authored JSON SHALL use Slack-native options shape: `options.format` and `options.choices[]` with `value`, `label`, and optional `color`. Flat `options: [{ value, label }]` at column root SHALL NOT be used in authored content.

#### Scenario: Inline select choices use nested shape

- **GIVEN** a list column of type `select` with inline choices
- **WHEN** the list JSON is validated
- **THEN** choices SHALL appear under `options.choices`
- **AND** `options.format` SHALL be present

#### Scenario: Flat options rejected

- **GIVEN** a list column with `options` as a root-level array
- **WHEN** validation runs
- **THEN** a descriptive error SHALL be thrown

---

### Requirement: TES options_ref extension

List columns MAY declare `options_ref` referencing a registered `@domain/*` ref instead of inline `options.choices`. `options_ref` and inline `options.choices` SHALL be mutually exclusive.

#### Scenario: options_ref resolves at compile time

- **GIVEN** a select column with `options_ref: "@domain/deliverable-statuses"`
- **WHEN** the list compiler builds the Slack schema
- **THEN** `options.choices` SHALL be populated from domain JSON
- **AND** the authored file SHALL NOT contain inline choices for that column

#### Scenario: Conflicting options and options_ref rejected

- **GIVEN** a list column with both `options_ref` and inline `options.choices`
- **WHEN** validation runs
- **THEN** a descriptive error SHALL be thrown

---

### Requirement: Full Slack surface in catalog and compilers

The capability catalog and content compilers SHALL cover the full Slack-documented component surface for modals, lists, and messages. Compilers SHALL accept any catalog-listed Slack-native type and emit payloads without artificial TES subset gates.

#### Scenario: Modal rich text input accepted

- **GIVEN** a modal input block with `element.type: "rich_text_input"`
- **WHEN** the modal compiler loads the file
- **THEN** validation SHALL succeed
- **AND** the compiled view SHALL include the rich text input element unchanged

#### Scenario: List multi_select column accepted

- **GIVEN** a list column with `type: "multi_select"` and valid `options.choices`
- **WHEN** the list compiler loads the file
- **THEN** validation SHALL succeed
- **AND** the Slack list schema SHALL include the multi_select column with options

#### Scenario: Message rich_text block accepted

- **GIVEN** a message template with a `rich_text` block conforming to Block Kit
- **WHEN** the message content is validated
- **THEN** validation SHALL succeed

#### Scenario: Unknown type still rejected

- **GIVEN** content referencing a component `type` not in the Slack catalog
- **WHEN** validation runs
- **THEN** a descriptive error SHALL be thrown

---

### Requirement: Compiler validation from catalog

Content compilers SHALL validate authored files against the capability catalog at load time and SHALL reject unknown component types, forbidden properties, and invalid extension combinations before calling Slack APIs.

#### Scenario: Invalid property on column type rejected

- **GIVEN** a list column of type `text` with an `options` property
- **WHEN** the list compiler loads the file
- **THEN** a descriptive validation error SHALL be thrown

#### Scenario: Invalid property on modal element rejected

- **GIVEN** a modal `plain_text_input` element with a forbidden property per the catalog
- **WHEN** the modal compiler loads the file
- **THEN** a descriptive validation error SHALL be thrown

---

### Requirement: JSON Schema for author tooling

The slack-app SHALL expose JSON Schema derived from the capability catalog for modal, list, and message content files so editors and agents can validate and autocomplete authored JSON against the full Slack surface.

#### Scenario: Modal content file references schema

- **GIVEN** a modal JSON file under `slack-app/content/modals/`
- **WHEN** an editor resolves `$schema`
- **THEN** all Slack input element types and allowed properties SHALL be constrained per the catalog

#### Scenario: List content file references schema

- **GIVEN** a list JSON file under `slack-app/content/lists/`
- **WHEN** an editor resolves `$schema`
- **THEN** all Slack list column types and options shapes SHALL be constrained per the catalog

#### Scenario: Message content file references schema

- **GIVEN** a message JSON template under `slack-app/content/messages/`
- **WHEN** an editor resolves `$schema`
- **THEN** all Slack Block Kit block types for messages SHALL be constrained per the catalog

---

### Requirement: Canvas authoring rules catalog

Canvas capability rules SHALL define template constraints separate from Block Kit: file suffix, forbidden author embedding of `<!-- tes-event-context -->`, and documented template variable expectations.

#### Scenario: Metadata block forbidden in author template

- **GIVEN** a canvas template containing `<!-- tes-event-context -->`
- **WHEN** canvas content is validated
- **THEN** a descriptive error SHALL be thrown

#### Scenario: Valid canvas template passes

- **GIVEN** a `.hbs.md` template without forbidden metadata
- **WHEN** canvas content is validated
- **THEN** validation SHALL succeed

---

### Requirement: Domain ref registry

The capability catalog SHALL include a domain ref registry mapping each `@domain/<name>` ref to a domain JSON source file. Compilers SHALL resolve refs only through this registry.

#### Scenario: Known domain ref resolves

- **GIVEN** `@domain/deliverable-statuses` is registered to `content/domain/deliverable-statuses.json`
- **WHEN** a list column references that ref
- **THEN** choices SHALL be loaded from the registered file

#### Scenario: Unknown domain ref rejected

- **GIVEN** a list column with `options_ref: "@domain/unknown"`
- **WHEN** validation runs
- **THEN** a descriptive error SHALL be thrown
