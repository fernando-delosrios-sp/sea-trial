# Infrastructure

Tech stack, external services, subscriptions, and deployment targets for the TES Slack Process platform.

## Purpose

Define runtime layout, hosting targets, external service boundaries, and environment configuration for MVP development and production migration. Captures infrastructure decisions from exploration session 2026-08-04.

## Requirements

### Requirement: Monorepo runtime layout

The project SHALL use a TypeScript monorepo with distinct runtimes per component.

#### Scenario: Component runtimes

- **GIVEN** the tes-event-process repository
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

### Requirement: OpenAI-compatible LLM configuration

The agent-service SHALL support any OpenAI-compatible LLM API via environment configuration.

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
- **THEN** outbound HTTPS to agent-service URL and LLM API SHALL be permitted by workspace policy

## Deferred (future phases)

- Data residency and customer-data handling policy
- Salesforce / opportunity channel integration
- Exact AWS or Azure target and migration runbook
