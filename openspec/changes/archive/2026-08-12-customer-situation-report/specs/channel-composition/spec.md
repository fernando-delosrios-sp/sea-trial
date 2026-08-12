## MODIFIED Requirements

### Requirement: Channel composition manifest

The slack-app SHALL define channel structure in a versioned JSON manifest under `slack-app/content/channels/`. The manifest SHALL declare `resources`, `chrome`, `gates`, `modals`, `navigation`, and optional `dynamic_resources` planes. Each provisioned entry SHALL have a stable `slot` identifier and `kind` referencing the kind registry. The `tes-event` manifest SHALL include a `situation_report` canvas resource.

#### Scenario: TES event manifest loads and validates

- **GIVEN** `content/channels/tes-event.json` exists
- **WHEN** the composition resolver loads the manifest
- **THEN** the manifest SHALL validate against the composition JSON Schema
- **AND** all resource slots SHALL map to `TesEventContext` fields via `runtime.context_slot_map`
- **AND** slot `situation_report` SHALL map to `situationReportCanvasId`

#### Scenario: Provisioning order respects dependencies

- **GIVEN** a resource entry with `depends_on` referencing other slots
- **WHEN** the resolver computes provisioning order
- **THEN** dependencies SHALL be provisioned before dependents (topological sort)
- **AND** cyclic dependencies SHALL be rejected with a clear error

### Requirement: Navigation auto-generation

The pinned index message SHALL derive object links from `navigation.entries` in the composition manifest rather than hardcoded link lists in TypeScript.

#### Scenario: Navigation entries render pinned links

- **GIVEN** a seeded channel with all resource slots populated
- **WHEN** the pinned index message is rendered
- **THEN** link lines SHALL follow `navigation.entries` order and labels
- **AND** each link SHALL reference the correct Slack object ID for its slot

#### Scenario: Situation report appears in channel index

- **GIVEN** `tes-event.json` navigation includes an entry for slot `situation_report`
- **WHEN** the pinned index message is rendered
- **THEN** a link to the Situation Report canvas SHALL be present
