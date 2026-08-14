## MODIFIED Requirements

### Requirement: Channel composition manifest

The slack-app SHALL define channel structure in a versioned JSON manifest under `slack-app/content/channels/`. The manifest SHALL declare an ordered `steps` array. Each step SHALL have a stable `id`, a `kind` (`canvas`, `list`, or `workflow`), and kind-specific fields validated by JSON Schema. Canvas and list steps SHALL reference content templates via `ref`. Workflow steps SHALL reference deploy-time app workflows via `link`. Optional `title` MAY label a step for pinned index derivation. Workflow steps MAY declare opt-in `bookmark: true` for Workflows tab bookmarked surfacing and opt-in `featured: true` for Workflows tab featured surfacing. The `tes-event` manifest SHALL include a `situation_report` canvas step.

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
- **AND** `bookmark` and `featured` SHALL NOT be present on canvas steps

#### Scenario: List bookmark flag validates

- **GIVEN** a composition step with `kind` `list`
- **WHEN** the manifest is validated
- **THEN** optional `bookmark` SHALL be allowed only as boolean `true`
- **AND** `tab` and `featured` SHALL NOT be present on list steps

#### Scenario: Workflow link validates

- **GIVEN** a composition step with `kind` `workflow`
- **WHEN** the manifest is validated
- **THEN** `link` SHALL be required
- **AND** `ref` and `tab` SHALL NOT be present
- **AND** optional `bookmark` and `featured` SHALL be allowed only as boolean `true`

#### Scenario: Provisioning order respects dependencies

- **GIVEN** the tes-event manifest declares `steps` in a defined order
- **WHEN** the resolver supplies steps to the provisioner
- **THEN** steps SHALL be executed in manifest array order
- **AND** cyclic or unknown `after` dependencies SHALL be rejected with a clear error when `after` is introduced in a future manifest version

### Requirement: Opt-in channel surfacing

The channel provisioner SHALL apply channel surfacing only when declared on a step. A canvas step with `tab: true` SHALL attach the canvas as a channel tab. A list step with `bookmark: true` SHALL add a channel header bookmark with a list deep link after the list is created. A workflow step with `bookmark: true` SHALL associate the deploy-time workflow trigger with the channel for Workflows tab bookmarked surfacing without creating a new trigger per channel. A workflow step with `featured: true` SHALL call `workflows.featured.add` for the channel. Steps without surfacing flags SHALL create or link objects without that surfacing.

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

- **GIVEN** a workflow step with `bookmark: true` and a deploy-time trigger for its `link`
- **WHEN** channel provisioning runs
- **THEN** the provisioner SHALL NOT create a new trigger for that channel
- **AND** the shared trigger SHALL be granted run access for the provisioned channel only
- **AND** the workflow SHALL appear in the channel Workflows tab bookmarked list

#### Scenario: Workflow featured opt-in

- **GIVEN** a workflow step with `featured: true` and a deploy-time trigger for its `link`
- **WHEN** channel provisioning runs
- **THEN** the provisioner SHALL call `workflows.featured.add` with the channel ID and shared trigger ID

## ADDED Requirements

### Requirement: Shared workflow trigger registry

The slack-app SHALL resolve workflow step `link` values to deploy-time trigger IDs without creating new triggers during channel provision. The onboarding link `open_onboarding_workflow` SHALL map to a single link trigger installed at deploy time.

#### Scenario: Onboarding trigger resolved at provision

- **GIVEN** a deploy-time onboarding link trigger exists for `open_onboarding_workflow`
- **WHEN** a workflow step with that link is provisioned
- **THEN** the provisioner SHALL resolve the existing trigger ID
- **AND** SHALL NOT call `workflows.triggers.create` for that step

#### Scenario: Unknown workflow link fails provision

- **GIVEN** a workflow step references an unknown `link`
- **WHEN** channel provisioning runs
- **THEN** provisioning SHALL fail with a clear error
