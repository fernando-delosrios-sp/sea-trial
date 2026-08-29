## MODIFIED Requirements

### Requirement: Shared workflow trigger registry

The slack-app SHALL treat workflow step `link` values as known workflow identifiers. For `open_onboarding_workflow`, channel provision SHALL create a per-channel Onboarding Link Trigger (not reuse a deploy-time shared Complete Onboarding trigger). Created trigger inputs SHALL include `channel_id`, `dashboard_canvas_id`, and a compact JSON `TesEventContext` snapshot. Unknown `link` values SHALL fail provision.

#### Scenario: Onboarding trigger resolved at provision

- **GIVEN** a workflow step with `link` `open_onboarding_workflow` and a provisioned Dashboard canvas ID
- **AND** a seed-time `TesEventContext` exists
- **WHEN** the workflow step is provisioned
- **THEN** the provisioner SHALL call `workflows.triggers.create`
- **AND** the created trigger inputs SHALL include the channel ID, Dashboard canvas ID, and compact JSON snapshot
- **AND** the trigger name SHALL be `Complete Onboarding ({channelId})`
- **AND** the provisioner SHALL NOT reuse a deploy-time shared Complete Onboarding trigger ID in place of create

#### Scenario: Unknown workflow link fails provision

- **GIVEN** a workflow step references an unknown `link`
- **WHEN** channel provisioning runs
- **THEN** provisioning SHALL fail with a clear error

#### Scenario: Missing dashboard canvas fails onboarding trigger create

- **GIVEN** a workflow step with `link` `open_onboarding_workflow`
- **AND** Dashboard canvas has not been provisioned
- **WHEN** the workflow step is provisioned
- **THEN** provisioning SHALL fail with a clear error that the Dashboard canvas is required
