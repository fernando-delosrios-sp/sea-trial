# Changelog

## 2026-08-07 — Domain Content JSON

### Added

- **Domain reference JSON** — `slack-app/content/domain/sailpoint-suites.json` and `deliverable-statuses.json` as the canonical source for suite mappings and status vocabulary
- **Domain loader** — `slack-app/lib/content/domain.ts` with schema validation and typed accessors (`getSupportedSuites`, `deriveComponents`, `getDeliverableStatusChoices`)
- **Sync tests** — Automated parity checks between domain JSON and `DeliverableStatus` shared type

### Changed

- **`suite-components.ts`** — Thin re-export from domain loader; no behavior change

---

## 2026-08-07 — CI Slack Trigger Provisioning

### Added

- **Automated trigger provisioning** — GitHub Actions deploy workflow runs `provision-triggers.sh` after `slack deploy` to create or update Slack shortcuts idempotently
- **`triggers.config.yaml`** — Declarative config per trigger: definition path, `scope` (`global` | `channel`), channel list, and `enabled` flag
- **Channel scope support** — Channel-scoped triggers provision one instance per channel ID; optional GitHub Variable `SLACK_TRIGGER_CHANNEL_IDS` supplies IDs at deploy time

### Changed

- **README trigger setup** — Manual `slack trigger create` steps replaced with automatic CI provisioning documentation
- **Trigger definition imports** — Fixed `@slack/deno-slack-api/mod.ts` imports for Slack CLI compatibility
- **Complete onboarding trigger** — Disabled in default config (`invalid_workflow_reference` for function-only trigger); pinned index block action remains primary entry

---

## 2026-08-07 — Complete Provisioning Trigger

### Added

- **Creation modal** — "Create TES Event" global shortcut opens a modal with Project Name, Account, Salesforce Opportunity URL, Members (multi-select), and Context Notes before provisioning
- **Dashboard Project section** — Seeds Account, SF link, members, notes, and status at channel creation
- **Complete onboarding button** — Pinned index Block Kit button opens onboarding; Account pre-filled from creation context
- **Member invitations** — Provision invites all selected members plus the trigger user (deduped)

### Changed

- **Account terminology** — `customerName` renamed to `accountName` across shared types and onboarding; modal label is "Account"
- **Summon-only agent copy** — Gate messages, pinned index, and requirements template direct users to @mention the bot (no auto-invoke on create or onboarding submit)

### Documentation

- Smoke test checklist updated for creation modal fields and Account pre-fill
- README trigger setup steps for `create_tes_event` and `complete_onboarding`

---

## 2026-08-05

### 📚 Documentation

- **Deployment readiness guide** — Complete `.deploy-mate/development/` artifacts covering architecture topology, 15 environment variables with step-by-step obtain instructions, deploy strategy, and rollback procedure. Operators now have a single source of truth for deploying agent-service (Render) and slack-app (Slack-managed infrastructure).

### 🐛 Fixes

- **Slack app import path** — Corrected module path in `provision_channel` function (`../lib/channel.ts` → `../../lib/channel.ts`), unblocking `slack run` and `slack deploy` commands which previously failed with module-not-found errors.

---

## Grafana OTLP Logging (2026-08-05)

### Added

- **`packages/observability`** — Shared log event types, correlation ID helpers, redaction utilities, and OTLP JSON payload builder
- **Grafana Cloud OTLP log push** — Both `agent-service` and `slack-app` export structured logs when `OTEL_LOGS_ENABLED=true`
- **Cross-service correlation** — slack-app sends `X-Correlation-Id`; agent-service attaches the same ID to all request log records
- **Deploy wiring** — GitHub Actions syncs OTLP env vars to Render and slack-app; manifest allowlists OTLP gateway hostname

### Changed

- **agent-service** — Lifecycle log events at request, parse, completion, and failure boundaries
- **slack-app** — `invoke_agent` instrumented with `invoke.started` / `invoke.completed` / `invoke.failed`; flush before function return
- **GitHub deploy workflow** — Optional validation for OTLP secrets when logging enabled

---

## 2026-08-04

### 🐛 Fixes

- **Empty document parsing** — DOCX, XLSX, and whitespace-only text files with no extractable content are now reported as parse failures with a clear per-file error, keeping the Requirements Canvas "Documents processed" section and agent clarification messages in sync
- **Requirements Canvas Out of Scope duplication** — `buildUpdatedCanvas` now replaces an existing `## Out of Scope` section on subsequent agent runs instead of appending a duplicate header

---

## Document Parsing and Memory Architecture (2026-08-04)

### Added

- **`FilePayload` shared type** — `{ filename, mimeType, contentBase64 }` for raw byte transport from slack-app to agent-service
- **`ParsedDocument` shared type** — `{ filename, mimeType, text, supported, error? }` for parser pipeline results
- **Dedicated parser modules** — `text.ts`, `docx.ts` (mammoth), `xlsx.ts` (sheetjs), `pdf.ts` (pdf-parse v2) with unified `parseDocument()` entry point
- **LangGraph `formatOutput` node** — Graph order: loadContext → parseDocuments → analyzeRequirements → clarifyOrPropose → formatOutput
- **Requirements Canvas "Documents processed" section** — Per-file parse status (success or error message)
- **Parser fixtures and tests** — TXT, DOCX, XLSX, text-based PDF, image-only PDF scenarios
- **Slack-native memory verification** — Confirms full canvas markdown on re-invoke; no vector store dependencies

### Changed

- **slack-app agent client** — Sends `FilePayload[]` with base64 raw bytes (no parsing in Deno adapter)
- **agent-service HTTP decode** — Accepts `files[].contentBase64` (legacy `documents[].content` still supported)
- **PDF handling** — Image-only/scanned PDFs rejected gracefully with clear error message

### Deferred (phase 2)

- External memory (qdrant, supermemory, gbrain)
- Python parser sidecar (markitdown, marker) for complex PDFs and OCR

## GitHub Actions deploy config (2026-08-04)

### Added

- **GitHub Actions deploy workflow** — `.github/workflows/deploy.yml` deploys agent-service (Render env sync + deploy hook + health check) then slack-app (`slack env set` + `slack deploy`)
- **Render blueprint** — `render.yaml` for agent-service web service
- **Slack-app env wiring** — `invoke_agent` reads `AGENT_SERVICE_URL` from deploy environment; manifest derives `outgoingDomains` from the same URL
- **Config tests** — `resolveAgentServiceUrl` and `buildOutgoingDomains` unit tests

### Changed

- **Configuration source of truth** — GitHub Secrets/Variables replace manual Render dashboard + Slack CLI setup for deployed environments
- **Documentation** — README and infrastructure checklist updated with GitHub Secrets inventory and workflow trigger instructions

## TES Slack Process MVP (2026-08-04)

### Added

- **Monorepo scaffold** — `slack-app/` (Deno Slack SDK), `agent-service/` (Node.js), `packages/shared/` (canonical types)
- **TES Event Channel provisioning** — global shortcut creates `#proj-{slug}-tes` channels with AE/SE invites
- **Channel object seeding** — Dashboard, Requirements, Infrastructure canvases; Deliverables and Incidents lists; pinned index with onboarding CTA
- **Onboarding modal** — AE/SE form with SailPoint suite selection; `deriveComponents` mapping; agent gate until complete
- **Document parsing** — PDF, DOCX, XLSX, and plain text support with graceful unsupported-format rejection
- **Requirements Agent** — LangGraph-style pipeline with no-merge, out-of-scope, and clarification rules; `POST /agents/requirements/process`
- **Slack agent invocation** — @mention handler with file download, canvas sync, Block Kit Accept/Edit/Reject proposals
- **Review gate** — Deliverables List writes only on Accept; Delivery Template Canvas created on demand
- **Tests** — Unit tests for channel validation, event context, suite mapping, agent gate, parsers, and agent rules
- **Documentation** — README, agent-service API docs, smoke test checklist

### Review gate

Deliverables are never written to the Deliverables List without explicit user acceptance via Block Kit buttons.







