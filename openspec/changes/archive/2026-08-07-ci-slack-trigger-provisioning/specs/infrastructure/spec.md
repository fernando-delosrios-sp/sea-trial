## ADDED Requirements

### Requirement: Automated Slack trigger provisioning on deploy

The deploy pipeline SHALL install or update Slack workflow triggers automatically after a successful `slack deploy`, using the app's service token and non-interactive CLI flags.

#### Scenario: Triggers provisioned after app deploy

- **GIVEN** the GitHub Actions deploy workflow completes `slack deploy` successfully
- **WHEN** the trigger provisioning step runs
- **THEN** each enabled trigger in the declarative config SHALL be created or updated in the target Slack workspace
- **AND** the step SHALL use `--app`, `--token`, and `-s` flags without interactive prompts

#### Scenario: Trigger provisioning failure fails deploy

- **GIVEN** trigger provisioning encounters a CLI or validation error
- **WHEN** the provisioning step exits non-zero
- **THEN** the deploy-slack-app job SHALL fail
- **AND** CI logs SHALL record which trigger definition failed

### Requirement: Declarative trigger configuration

The slack-app SHALL declare trigger provisioning intent in a version-controlled config file listing trigger definition paths, scope, and optional channel IDs.

#### Scenario: Config lists default MVP triggers

- **GIVEN** `slack-app/triggers.config.yaml` in the repository
- **WHEN** an operator reads the config
- **THEN** it SHALL include an entry for `create_tes_event` with scope `global` and `enabled: true` by default
- **AND** it SHALL reference trigger definition files under `slack-app/triggers/`

#### Scenario: Disabled triggers skipped

- **GIVEN** a trigger entry with `enabled: false`
- **WHEN** provisioning runs
- **THEN** that trigger SHALL NOT be created or updated

### Requirement: Configurable trigger scope

Each trigger entry SHALL support scope `global` or `channel`. Channel-scoped triggers SHALL require one or more Slack channel IDs.

#### Scenario: Global scope trigger

- **GIVEN** a trigger entry with `scope: global`
- **WHEN** provisioning runs
- **THEN** a workspace-wide shortcut trigger SHALL be created or updated

#### Scenario: Channel scope with configured channel list

- **GIVEN** a trigger entry with `scope: channel` and a non-empty channel ID list
- **WHEN** provisioning runs
- **THEN** one trigger instance SHALL be created or updated per listed channel ID
- **AND** each instance SHALL be limited to its channel

#### Scenario: Channel scope with environment override

- **GIVEN** a trigger entry with `scope: channel` and empty inline `channels`
- **WHEN** the GitHub Variable `SLACK_TRIGGER_CHANNEL_IDS` is set to a comma-separated list of channel IDs
- **THEN** provisioning SHALL use those channel IDs for that trigger

### Requirement: Idempotent trigger sync

Re-running deploy SHALL update existing triggers rather than failing on duplicates.

#### Scenario: Update existing trigger on re-deploy

- **GIVEN** a trigger with matching name and workflow or function reference already exists in the workspace
- **WHEN** provisioning runs again after a code or config change
- **THEN** the existing trigger SHALL be updated via the Slack CLI update command
- **AND** provisioning SHALL NOT fail with a duplicate-trigger error

#### Scenario: Create missing trigger on re-deploy

- **GIVEN** no matching trigger exists for an enabled config entry
- **WHEN** provisioning runs
- **THEN** a new trigger SHALL be created
