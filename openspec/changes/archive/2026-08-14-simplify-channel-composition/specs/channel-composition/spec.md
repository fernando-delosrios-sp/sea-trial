## MODIFIED Requirements

### Requirement: Channel composition manifest

The slack-app SHALL define channel structure in a versioned JSON manifest under `slack-app/content/channels/`. The manifest SHALL declare an ordered `steps` array. Each step SHALL have a stable `id`, a `kind` (`canvas`, `list`, or `workflow`), and kind-specific fields validated by JSON Schema. Canvas and list steps SHALL reference content templates via `ref`. Workflow steps SHALL reference deploy-time app workflows via `link`. Optional `title` MAY label a step for pinned index derivation. The `tes-event` manifest SHALL include a `situation_report` canvas step.

#### Scenario: TES event manifest loads and validates

- **GIVEN** `content/channels/tes-event.json` exists
- **WHEN** the composition resolver loads the manifest
- **THEN** the manifest SHALL validate against the composition JSON Schema
- **AND** each step `id` SHALL be unique within the manifest
- **AND** step `situation_report` SHALL exist with kind `canvas`

#### Scenario: Kind-scoped surfacing flags validate

- **GIVEN** a composition step with `kind` `canvas`
- **WHEN** the manifest is validated
- **THEN** optional `tab` SHALL be allowed only as boolean `true`
- **AND** `bookmark` SHALL NOT be present on canvas steps

#### Scenario: List bookmark flag validates

- **GIVEN** a composition step with `kind` `list`
- **WHEN** the manifest is validated
- **THEN** optional `bookmark` SHALL be allowed only as boolean `true`
- **AND** `tab` SHALL NOT be present on list steps in this change

#### Scenario: Workflow link validates

- **GIVEN** a composition step with `kind` `workflow`
- **WHEN** the manifest is validated
- **THEN** `link` SHALL be required
- **AND** `tab` and `bookmark` SHALL NOT be present

#### Scenario: Provisioning order respects dependencies

- **GIVEN** the tes-event manifest declares `steps` in a defined order
- **WHEN** the resolver supplies steps to the provisioner
- **THEN** steps SHALL be executed in manifest array order
- **AND** cyclic or unknown `after` dependencies SHALL be rejected with a clear error when `after` is introduced in a future manifest version

### Requirement: Slot-based context linking

Object IDs provisioned during channel create SHALL be stored using step `id` identifiers. The provisioner SHALL bridge step IDs to flat `TesEventContext` fields for backward compatibility using an internal id-to-field map maintained in code (not in the manifest).

#### Scenario: Slot map populates context fields

- **GIVEN** provisioning completes for steps `dashboard`, `requirements`, and `deliverables`
- **WHEN** context is serialized to Dashboard metadata
- **THEN** `dashboardCanvasId`, `requirementsCanvasId`, and `deliverablesListId` SHALL contain the provisioned Slack IDs

### Requirement: Kind registry

The slack-app SHALL maintain an open kind registry under `slack-app/content/kinds/*.v1.json`. Each kind SHALL declare `api_availability` (`stable`, `preview`, `planned`). Only kinds with `api_availability: stable` SHALL be provisioned.

#### Scenario: Stable kinds are provisioned

- **GIVEN** a composition step references kind `canvas` with registry `api_availability: stable`
- **WHEN** channel provisioning runs
- **THEN** the canvas provision handler SHALL execute

#### Scenario: Unstable kinds are skipped

- **GIVEN** a composition step references a kind with `api_availability: planned`
- **WHEN** channel provisioning runs
- **THEN** the step SHALL be skipped without error

## ADDED Requirements

### Requirement: Opt-in channel surfacing

The channel provisioner SHALL apply channel surfacing only when declared on a step. A canvas step with `tab: true` SHALL attach the canvas as a channel tab. A list step with `bookmark: true` SHALL add a channel bookmark with a list deep link after the list is created. Steps without `tab` or `bookmark` SHALL create the Slack object without that surfacing.

#### Scenario: Canvas tab opt-in

- **GIVEN** a canvas step with `tab: true`
- **WHEN** channel provisioning runs
- **THEN** the canvas SHALL be created with channel tab attachment

#### Scenario: Canvas without tab

- **GIVEN** a canvas step without `tab`
- **WHEN** channel provisioning runs
- **THEN** the canvas SHALL be created without channel tab attachment

#### Scenario: List bookmark opt-in

- **GIVEN** a list step with `bookmark: true`
- **WHEN** channel provisioning runs
- **THEN** the list SHALL be created
- **AND** a channel bookmark linking to the list SHALL be added via `bookmarks.add`

#### Scenario: List without bookmark

- **GIVEN** a list step without `bookmark`
- **WHEN** channel provisioning runs
- **THEN** the list SHALL be created without adding a channel bookmark

### Requirement: Pinned index from steps

The pinned index message SHALL derive navigable object links from manifest `steps` that have a `title` and a provisioned object ID, in `steps` order, rather than from a separate `navigation` block.

#### Scenario: Pinned index follows step order

- **GIVEN** a seeded channel with all titled steps populated
- **WHEN** the pinned index message is rendered
- **THEN** link lines SHALL follow `steps` order for steps with `title`
- **AND** each link SHALL reference the correct Slack object ID for its step `id`

#### Scenario: Situation report appears in pinned index

- **GIVEN** `tes-event.json` includes a titled `situation_report` canvas step
- **WHEN** the pinned index message is rendered
- **THEN** a link to the Situation Report canvas SHALL be present

## REMOVED Requirements

### Requirement: Navigation auto-generation

**Reason**: Navigation duplicated step declarations; pinned index now derives from `steps` with `title`.

**Migration**: Remove `navigation` from channel manifests; ensure each indexed object has `title` on its step.
