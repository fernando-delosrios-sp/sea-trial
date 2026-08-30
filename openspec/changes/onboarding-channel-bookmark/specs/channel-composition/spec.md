## MODIFIED Requirements

### Requirement: Channel composition manifest

The slack-app SHALL define channel structure in a versioned JSON manifest under `slack-app/content/channels/`. The manifest SHALL declare an ordered `steps` array. Each step SHALL have a stable `id`, a `kind` (`canvas` or `list`), and kind-specific fields validated by JSON Schema. Canvas and list steps SHALL reference content templates via `ref`. Optional `title` MAY label a step for pinned index derivation. A step with `kind` `workflow` SHALL be rejected by the JSON Schema and by the composition resolver. The `tes-event` manifest SHALL include a `situation_report` canvas step and SHALL NOT include a workflow step.

#### Scenario: TES event manifest loads and validates

- **GIVEN** `content/channels/tes-event.json` exists
- **WHEN** the composition resolver loads the manifest
- **THEN** the manifest SHALL validate against the composition JSON Schema
- **AND** each step `id` SHALL be unique within the manifest
- **AND** step `situation_report` SHALL exist with kind `canvas`
- **AND** no step SHALL have kind `workflow`

#### Scenario: Kind-scoped surfacing flags validate

- **GIVEN** a composition step with `kind` `canvas`
- **WHEN** the manifest is validated
- **THEN** optional `tab` SHALL be allowed only as boolean `true`
- **AND** `bookmark` and `featured` SHALL NOT be present on canvas steps

#### Scenario: List bookmark flag validates

- **GIVEN** a composition step with `kind` `list`
- **WHEN** the manifest is validated
- **THEN** optional `bookmark` SHALL be allowed only as boolean `true`
- **AND** `tab` and `featured` SHALL NOT be present on list steps

#### Scenario: Workflow link validates

- **GIVEN** a composition step with `kind` `workflow`, with or without a `link`
- **WHEN** the manifest is validated
- **THEN** validation SHALL fail with a clear error naming the unsupported kind
- **AND** the composition resolver SHALL NOT return the step for provisioning

#### Scenario: Provisioning order respects dependencies

- **GIVEN** the tes-event manifest declares `steps` in a defined order
- **WHEN** the resolver supplies steps to the provisioner
- **THEN** steps SHALL be executed in manifest array order
- **AND** cyclic or unknown `after` dependencies SHALL be rejected with a clear error when `after` is introduced in a future manifest version

### Requirement: Opt-in channel surfacing

The channel provisioner SHALL apply channel surfacing only when declared on a step. A canvas step with `tab: true` SHALL attach the canvas as a channel tab. A list step with `bookmark: true` SHALL add a channel header bookmark with a list deep link after the list is created. Steps without canvas `tab` or list `bookmark` SHALL create or link objects without that surfacing. Channel surfacing SHALL NOT create a per-channel onboarding trigger or feature a workflow. Granting the global `Complete onboarding` shortcut to the channel is not a composition step.

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
- **AND** a channel header bookmark linking to the list SHALL be added via `bookmarks.add`

#### Scenario: List without bookmark

- **GIVEN** a list step without `bookmark`
- **WHEN** channel provisioning runs
- **THEN** the list SHALL be created without adding a channel header bookmark

#### Scenario: Workflow bookmark opt-in

- **GIVEN** a workflow step that includes `bookmark: true`
- **WHEN** the manifest is validated
- **THEN** validation SHALL fail
- **AND** the provisioner SHALL NOT associate a workflow with the channel Workflows tab bookmarked list

#### Scenario: Workflow featured opt-in

- **GIVEN** a workflow step that includes `featured: true`
- **WHEN** the manifest is validated
- **THEN** validation SHALL fail
- **AND** the provisioner SHALL NOT call `workflows.featured.add`

#### Scenario: No per-channel onboarding trigger during provisioning

- **GIVEN** a `tes-event` channel is provisioned from the manifest
- **WHEN** provisioning completes
- **THEN** the provisioner SHALL NOT call `workflows.triggers.create`
- **AND** the provisioner SHALL NOT call `workflows.featured.add`
- **AND** the provisioner SHALL NOT associate any workflow with the channel Workflows tab

---

## REMOVED Requirements

### Requirement: Shared workflow trigger registry

**Reason**: The registry existed solely to turn `open_onboarding_workflow` into a per-channel Onboarding Link Trigger.

**Migration**: `workflow-trigger-registry.ts` and per-channel create in `onboarding-channel-trigger.ts` are deleted. The global `Complete onboarding` shortcut is installed at deploy. Existing per-channel triggers are deleted by `scripts/cleanup-onboarding-triggers.ts`.
