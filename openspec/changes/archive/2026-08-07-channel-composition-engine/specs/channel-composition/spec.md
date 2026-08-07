# Channel Composition

## Purpose

Declarative blueprint for TES Event Channel structure — which Slack objects compose a channel, provisioning order, slot linking, and navigation.

## ADDED Requirements

### Requirement: Channel composition manifest

The slack-app SHALL define channel structure in a versioned JSON manifest under `slack-app/content/channels/`. The manifest SHALL declare `resources`, `chrome`, `gates`, `modals`, `navigation`, and optional `dynamic_resources` planes. Each provisioned entry SHALL have a stable `slot` identifier and `kind` referencing the kind registry.

#### Scenario: TES event manifest loads and validates

- **GIVEN** `content/channels/tes-event.json` exists
- **WHEN** the composition resolver loads the manifest
- **THEN** the manifest SHALL validate against the composition JSON Schema
- **AND** all resource slots SHALL map to `TesEventContext` fields via `runtime.context_slot_map`

#### Scenario: Provisioning order respects dependencies

- **GIVEN** a resource entry with `depends_on` referencing other slots
- **WHEN** the resolver computes provisioning order
- **THEN** dependencies SHALL be provisioned before dependents (topological sort)
- **AND** cyclic dependencies SHALL be rejected with a clear error

### Requirement: Kind registry

The slack-app SHALL maintain an open kind registry under `slack-app/content/kinds/*.v1.json`. Each kind SHALL declare `api_availability` (`stable`, `preview`, `planned`). Only kinds with `api_availability: stable` SHALL be provisioned.

#### Scenario: Stable kinds are provisioned

- **GIVEN** a composition entry references kind `canvas` with registry `api_availability: stable`
- **WHEN** channel provisioning runs
- **THEN** the canvas provision handler SHALL execute

#### Scenario: Unstable kinds are skipped

- **GIVEN** a composition entry references a kind with `api_availability: planned`
- **WHEN** channel provisioning runs
- **THEN** the entry SHALL be skipped without error

### Requirement: Slot-based context linking

Object IDs provisioned during channel create SHALL be stored using slot identifiers cross-referenced in the composition manifest. The provisioner SHALL bridge slot IDs to flat `TesEventContext` fields via `runtime.context_slot_map` for backward compatibility.

#### Scenario: Slot map populates context fields

- **GIVEN** provisioning completes for slots `dashboard`, `requirements`, `deliverables`
- **WHEN** context is serialized to Dashboard metadata
- **THEN** `dashboardCanvasId`, `requirementsCanvasId`, and `deliverablesListId` SHALL contain the provisioned Slack IDs

### Requirement: Navigation auto-generation

The pinned index message SHALL derive object links from `navigation.entries` in the composition manifest rather than hardcoded link lists in TypeScript.

#### Scenario: Navigation entries render pinned links

- **GIVEN** a seeded channel with all resource slots populated
- **WHEN** the pinned index message is rendered
- **THEN** link lines SHALL follow `navigation.entries` order and labels
- **AND** each link SHALL reference the correct Slack object ID for its slot
