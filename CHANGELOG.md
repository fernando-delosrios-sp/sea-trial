# Changelog

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
