# Step 5 — Draft changelog

## 2026-08-05

### 📚 Documentation

- **Deployment readiness guide** — Complete `.deploy-mate/development/` artifacts covering architecture topology, 15 environment variables with step-by-step obtain instructions, deploy strategy, and rollback procedure. Operators now have a single source of truth for deploying agent-service (Render) and slack-app (Slack-managed infrastructure).

### 🐛 Fixes

- **Slack app import path** — Corrected module path in `provision_channel` function (`../lib/channel.ts` → `../../lib/channel.ts`), unblocking `slack run` and `slack deploy` commands which previously failed with module-not-found errors.
