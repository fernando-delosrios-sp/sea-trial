# Changelog

## 2026-08-13 — Sea Trial rename

### Changed

- **Project identity** — Rename monorepo from `tes-event-process` to `sea-trial` (`@sea-trial/*` npm packages, `@sea-trial/` Deno imports)
- **Observability** — OTLP service names default to `sea-trial-agent-service` and `sea-trial-slack-app`
- **Render blueprint** — `render.yaml` service name `sea-trial-agent-service`
- **Documentation** — README, OpenSpec, and smoke-test checklist updated to Sea Trial

### Fixed

- **Canvas template security** — Validate forbidden patterns when embedding and loading precompiled Handlebars canvas templates

### Removed

- **Legacy Bolt template** — Deleted unused `slack-app/tes-event-process/` scaffold

---

## 2026-08-13 — Slack Lists API

### Fixed

- **Slack Lists creation** — Align list schemas with Slack Lists API (primary column, typed columns, select colors, snake_case values) and grant channel access after create instead of passing `channel_id`
- **Hosted template rendering** — Precompile Handlebars canvas and message templates at build time alongside existing embedded content

---

## 2026-08-12 — Hosted Slack Content

### Fixed

- **Create TES Event shortcut** — Embed declarative UI content and banner assets at build time so hosted Slack functions no longer fail on filesystem reads

---

## 2026-08-12 — Delivery Template Canvas

### Added

- **Delivery canvas template** — `delivery.hbs.md` with customer-facing sections (business value, visual proof, components, technologies, customer summary) and internal sections (artefacts, configuration)
- **Delivery agent** — `POST /agents/delivery/consolidate` drafts and re-consolidates canvas content from list row + existing canvas
- **Validation required trigger** — `on_validation_required` function creates canvas and first draft when list status reaches Validation required
- **Canvas actions** — `consolidate_delivery` and `mark_delivery_reviewed` functions for manual re-run and review clearance
- **Situation Report excerpt** — Reads reviewed `## Customer summary` from linked delivery canvas (500 char soft cap)

### Changed

- **Accept flow** — Deliverables List rows created on Accept without delivery canvas; Deliverable link populated at Validation required
- **Review gate message** — Accept confirmation references deferred canvas creation

---

## 2026-08-12 — Customer Situation Report

### Added

- **Situation Report canvas** — `situation-report.hbs.md` seeded per TES event channel with executive summary, category-grouped detail, and changelog table
- **Customer status buckets** — `customer-deliverable-statuses.json` maps internal deliverable statuses to customer-facing labels (In progress, Needs your input, In review, Complete, Out of scope)
- **Manual publish** — Pinned index **Publish situation report** button (post-onboarding) reads Deliverables List rows and updates the Situation Report canvas without modifying list data
- **`situationReportCanvasId`** — New `TesEventContext` field and `situation_report` composition slot with navigation link

### Changed

- **Pinned index** — Shows publish button when onboarding is complete; copy mentions situation report publishing
- **Channel composition** — `tes-event.json` provisions Situation Report canvas before Dashboard
- **Pinned index navigation links** — Render clickable Slack canvas/list URLs using `SLACK_TEAM_ID` instead of pseudo link syntax

---

## 2026-08-10 — Content Capability Catalog

### Added

- **Capability catalog** — Full Slack surface definitions under `slack-app/schemas/content/capabilities/` for modals (input elements), lists (column types), messages (Block Kit blocks), canvas rules, TES extensions, and `@domain/*` ref registry
- **Capability validator** — `capability-catalog.ts`, `capability-validator.ts`, and `domain-ref-resolver.ts` drive compile-time validation from the same catalog used for authoring
- **Message blocks JSON Schema** — `schemas/content/message-blocks.schema.json` with `content/messages/pinned-index.meta.json` schema link for Handlebars templates
- **Content author guide** — `slack-app/content/README.md` listing valid types and Slack-native list options shape

### Changed

- **List select options** — Authored lists use Slack shape `options: { format, choices[] }`; flat root `options[]` rejected; `options_ref` resolves to `options.choices` at compile time
- **List Slack schema** — `getSlackListSchema()` emits column `key` and `options` for select columns
- **JSON Schema** — `modal.schema.json` and `list.schema.json` enum all Slack-native types from the catalog
- **Compilers** — Modal, list, message, and canvas loaders validate against capability catalog before use

---

## 2026-08-10 — TES Event Dashboard Canvas

### Added

- **Default dashboard canvas content** — `slack-app/content/canvases/dashboard.md` with rules of engagement, role banners, and onboarding checklists
- **Canvas banner uploads** — Role banner images upload to Slack at channel provision and onboarding submit, with repo-relative paths for Markdown preview

### Changed

- **Dashboard Handlebars overlay** — `dashboard.hbs.md` now only renders dynamic Project, Opportunity, and Derived Components sections appended to the default template
- **Slack app scopes and outgoing domains** — Added `files:write` and allowlisted `files.slack.com` for canvas banner uploads

---

## 2026-08-07 — Channel Composition Engine

### Added

- **Channel composition manifest** — `slack-app/content/channels/tes-event.json` defining resources, chrome, gates, modals, navigation, and dynamic resources
- **Kind registry** — `slack-app/content/kinds/*.v1.json` with `api_availability` gating for extensible object types
- **Composition loaders** — `composition-resolver.ts`, `kind-registry.ts`, `channel-provisioner.ts`
- **Composition schema and tests** — `composition.schema.json` and `composition_test.ts` for validation, topological sort, slot bridging, and navigation

### Changed

- **`seed_channel_objects`** — Thin executor delegating to `channel-provisioner`
- **Pinned index message** — Links auto-generated from `navigation.entries` in composition manifest
- **`TesEventContext`** — Optional `channelType` and `compositionVersion` fields when seeded via composition

---

## 2026-08-07 — Declarative Slack Content

### Added

- **Declarative UI content files** — Modals (`content/modals/`), lists (`content/lists/`), canvases (`content/canvases/*.hbs.md`), and pinned index message (`content/messages/pinned-index.hbs.json`)
- **Content loaders** — `modal-compiler.ts`, `canvas-renderer.ts`, `list-compiler.ts`, `message-renderer.ts`, unified `loader.ts`
- **JSON Schema** — Content shape definitions under `slack-app/schemas/content/`
- **Content tests** — `slack_content_test.ts` for block_id contracts, domain ref resolution, and template rendering
- **Handlebars dependency** — `npm:handlebars@4.7.8` in `slack-app/deno.jsonc`

### Changed

- **Creation and onboarding modals** — Loaded from JSON instead of inline Block Kit in function/lib files
- **List creation** — Column schemas from `deliverables.json` / `incidents.json` with `@domain/deliverable-statuses` for Status options
- **Channel seeding** — Dashboard, Requirements, Infrastructure canvases and pinned index from content loaders

### Removed

- **`slack-app/templates/index.ts`** — Replaced by content loaders

---

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











