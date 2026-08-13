# Infrastructure

Tech stack, external services, subscriptions, and deployment targets for the Sea Trial platform.

## Purpose

Define runtime layout, hosting targets, external service boundaries, and environment configuration for MVP development and production migration. Captures infrastructure decisions from exploration session 2026-08-04.
## Requirements
### Requirement: Monorepo runtime layout

The project SHALL use a TypeScript monorepo with distinct runtimes per component.

#### Scenario: Component runtimes

- **GIVEN** the sea-trial repository
- **WHEN** services are deployed
- **THEN** `slack-app/` SHALL run on Deno via the Deno Slack SDK on Slack-managed infrastructure
- **AND** `agent-service/` SHALL run on Node.js 20+ as an external HTTP service
- **AND** `packages/shared/` SHALL hold canonical TypeScript types consumed by both runtimes

### Requirement: Slack workspace plan for MVP

MVP development and smoke testing SHALL use a Slack workspace on a paid plan that supports Canvas, Lists, and custom app deployment to Slack infrastructure.

#### Scenario: Pro workspace feature availability

- **GIVEN** a Slack Pro workspace (or higher)
- **WHEN** the TES app is installed and provisioned
- **THEN** Canvas, Lists, and Slack-managed app hosting SHALL be available for MVP use

#### Scenario: Enterprise Grid production target

- **GIVEN** production rollout beyond MVP
- **WHEN** org-wide deployment is required
- **THEN** Slack Enterprise Grid SHALL be the production target for SSO, audit, and org-wide install

### Requirement: Agent-service hosting for MVP

The agent-service SHALL be hosted on a platform suitable for long-running HTTP requests during document parsing and LLM reasoning.

#### Scenario: Render MVP deployment

- **GIVEN** MVP development or smoke testing
- **WHEN** agent-service is deployed
- **THEN** Render free-tier web service MAY be used as the initial host
- **AND** the service SHALL expose a public HTTPS URL reachable from Slack Functions
- **AND** the service SHALL expose a `/health` endpoint for platform health checks

#### Scenario: Production migration path

- **GIVEN** company policy requires cloud standardization
- **WHEN** agent-service moves beyond MVP
- **THEN** deployment SHALL be portable to AWS or Azure (container-friendly, env-driven config)
- **AND** no external database SHALL be introduced for application state

### Requirement: GitHub Secrets and Variables inventory

The project SHALL document a canonical inventory of GitHub Secrets and Variables required for deployment.

#### Scenario: Secrets inventory documented

- **GIVEN** an operator configuring the GitHub repository
- **WHEN** they read the deployment documentation
- **THEN** they SHALL find a list of required GitHub Secrets: `LLM_API_KEY`, `SLACK_SERVICE_TOKEN`, `RENDER_API_KEY`, and `RENDER_DEPLOY_HOOK_URL`
- **AND** they SHALL find required GitHub Variables: `AGENT_SERVICE_URL`, `LLM_BASE_URL`, `LLM_MODEL`, and `RENDER_SERVICE_ID`
- **AND** when OTLP logging is enabled (`OTEL_LOGS_ENABLED=true`), they SHALL find optional GitHub Secret `OTEL_EXPORTER_OTLP_HEADERS` and Variables `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_LOGS_ENABLED`

#### Scenario: Secrets not committed to repository

- **GIVEN** the sea-trial repository
- **WHEN** configuration values are stored
- **THEN** secret values SHALL exist only in GitHub Secrets or local gitignored `.env` files
- **AND** SHALL NOT be committed to version control

### Requirement: GitHub Actions deployment workflow

The project SHALL provide a GitHub Actions workflow that deploys both `agent-service` and `slack-app` using configuration from GitHub Secrets and Variables.

#### Scenario: Manual deploy trigger

- **GIVEN** all required GitHub Secrets and Variables are configured
- **WHEN** an operator triggers the deploy workflow via `workflow_dispatch`
- **THEN** the workflow SHALL deploy `agent-service` to Render with `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` from GitHub
- **AND** when OTLP logging is enabled, SHALL sync `OTEL_*` environment variables to Render and slack-app
- **AND** SHALL deploy `slack-app` to Slack ROSI with `AGENT_SERVICE_URL` set via `slack env set`
- **AND** the workflow run log SHALL record the trigger actor and timestamp

#### Scenario: Agent-service deploy precedes slack-app deploy

- **GIVEN** a deploy workflow run
- **WHEN** both services are deployed
- **THEN** the agent-service deploy job SHALL complete (including health check) before the slack-app deploy job starts

#### Scenario: Deploy fails on missing secrets

- **GIVEN** a required GitHub Secret or Variable is not configured
- **WHEN** the deploy workflow runs
- **THEN** the workflow SHALL fail with a clear error
- **AND** SHALL NOT proceed with partial deployment of the dependent service

### Requirement: Slack-app agent URL from deploy environment

The slack-app SHALL read the agent-service URL from the function environment at runtime, set during CI deploy.

#### Scenario: invoke_agent uses AGENT_SERVICE_URL env

- **GIVEN** a deployed slack-app with `AGENT_SERVICE_URL` set via `slack env set` during CI
- **WHEN** the `invoke_agent` function executes
- **THEN** it SHALL read `env["AGENT_SERVICE_URL"]` to call the agent-service
- **AND** SHALL NOT require `agent_service_url` as a function input parameter

#### Scenario: Missing AGENT_SERVICE_URL fails clearly

- **GIVEN** a deployed slack-app without `AGENT_SERVICE_URL` configured
- **WHEN** the `invoke_agent` function executes
- **THEN** it SHALL fail with a clear configuration error
- **AND** SHALL NOT attempt an HTTP call with an empty or undefined URL

### Requirement: OpenAI-compatible LLM configuration

The agent-service SHALL support any OpenAI-compatible LLM API via environment configuration. For deployed environments, LLM environment variables SHALL be sourced from GitHub Secrets and Variables and applied during CI deployment to Render.

#### Scenario: Configurable LLM endpoint

- **GIVEN** agent-service startup
- **WHEN** LLM environment variables are set
- **THEN** the service SHALL read `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL`
- **AND** `LLM_BASE_URL` SHALL allow non-OpenAI vendors (e.g. Azure OpenAI, Groq, Together)
- **AND** no code change SHALL be required to swap vendors when env vars change

#### Scenario: Missing LLM configuration

- **GIVEN** agent-service receives a process request
- **WHEN** required LLM environment variables are absent
- **THEN** the service SHALL fail with a clear configuration error
- **AND** SHALL NOT attempt anonymous or unauthenticated LLM calls

#### Scenario: LLM config deployed from GitHub

- **GIVEN** a GitHub Actions deploy workflow run
- **WHEN** agent-service is deployed to Render
- **THEN** `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` on Render SHALL match the values in GitHub Secrets and Variables
- **AND** changing those GitHub values and re-running the workflow SHALL update the deployed configuration without manual Render dashboard edits

### Requirement: External service boundary

Application state SHALL remain Slack-native; only agent reasoning uses external services.

#### Scenario: No external database

- **GIVEN** any deployment phase covered by this spec
- **WHEN** application state is persisted
- **THEN** state SHALL live in Slack canvases and lists only
- **AND** agent-service SHALL NOT require Postgres, Redis, or equivalent state stores

#### Scenario: Outbound connectivity

- **GIVEN** a deployed slack-app calling agent-service
- **WHEN** Slack Functions execute
- **THEN** outbound HTTPS to agent-service URL, LLM API, and Grafana Cloud OTLP gateway (when logging enabled) SHALL be permitted by workspace policy and manifest `outgoingDomains`

### Requirement: Observability environment configuration

Deploy-time configuration SHALL supply Grafana Cloud OTLP settings to both runtimes without storing credentials in source control.

#### Scenario: Agent-service OTLP env vars

- **GIVEN** agent-service is deployed to Render
- **WHEN** observability is enabled
- **THEN** the service SHALL receive `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_SERVICE_NAME`, and `OTEL_LOGS_ENABLED` via environment variables
- **AND** credentials SHALL be sourced from GitHub Secrets at deploy time

#### Scenario: Slack-app OTLP env vars

- **GIVEN** slack-app is deployed via GitHub Actions
- **WHEN** observability is enabled
- **THEN** the deploy workflow SHALL set OTLP environment variables on the Slack app via `slack env set`
- **AND** functions SHALL read OTLP settings from the function `env` context

### Requirement: Slack outbound domain for OTLP gateway

slack-app SHALL allow outbound HTTPS to the Grafana Cloud OTLP gateway.

#### Scenario: OTLP hostname in outgoingDomains

- **GIVEN** `OTEL_EXPORTER_OTLP_ENDPOINT` is configured at manifest build or deploy time
- **WHEN** the Slack app manifest is generated
- **THEN** `outgoingDomains` SHALL include the OTLP gateway hostname derived from that endpoint
- **AND** SHALL continue to include the agent-service hostname and `localhost` for development

#### Scenario: Blocked outbound without allowlist

- **GIVEN** the OTLP gateway hostname is not in `outgoingDomains`
- **WHEN** a Slack function attempts OTLP log push
- **THEN** Slack SHALL block the outbound request
- **AND** the manifest SHALL be updated to include the gateway hostname before production observability is enabled

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

## Deferred (future phases)

- Data residency and customer-data handling policy
- Salesforce / opportunity channel integration
- Exact AWS or Azure target and migration runbook

