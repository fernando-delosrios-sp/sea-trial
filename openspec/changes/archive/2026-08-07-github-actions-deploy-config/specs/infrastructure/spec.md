## ADDED Requirements

### Requirement: GitHub Secrets and Variables inventory

The project SHALL document a canonical inventory of GitHub Secrets and Variables required for deployment.

#### Scenario: Secrets inventory documented

- **GIVEN** an operator configuring the GitHub repository
- **WHEN** they read the deployment documentation
- **THEN** they SHALL find a list of required GitHub Secrets: `LLM_API_KEY`, `SLACK_SERVICE_TOKEN`, `RENDER_API_KEY`, and `RENDER_DEPLOY_HOOK_URL`
- **AND** they SHALL find required GitHub Variables: `AGENT_SERVICE_URL`, `LLM_BASE_URL`, `LLM_MODEL`, and `RENDER_SERVICE_ID`
- **AND** when OTLP logging is enabled (`OTEL_LOGS_ENABLED=true`), they SHALL find optional GitHub Secret `OTEL_EXPORTER_OTLP_HEADERS` and Variables `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_LOGS_ENABLED`

#### Scenario: Secrets not committed to repository

- **GIVEN** the tes-event-process repository
- **WHEN** configuration values are stored
- **THEN** secret values SHALL exist only in GitHub Secrets or local gitignored `.env` files
- **AND** SHALL NOT be committed to version control

---

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

---

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

---

## MODIFIED Requirements

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

