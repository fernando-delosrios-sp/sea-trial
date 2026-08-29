#!/usr/bin/env bash
# Delete legacy "Complete Onboarding" shortcut triggers and unset stale env vars.
#
# Required for CI:
#   SLACK_SERVICE_TOKEN — CLI service token (same as slack deploy)
#
# Optional env:
#   SLACK_APP_ID — override app id (default: read from .slack/apps.json)
#
# Local usage (logged-in Slack CLI session):
#   ./scripts/cleanup-onboarding-triggers.sh
#
# Dry run:
#   ./scripts/cleanup-onboarding-triggers.sh --dry-run

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_ID="${SLACK_APP_ID:-}"
if [ -z "$APP_ID" ]; then
  APP_ID="$(deno run -q --allow-read scripts/read-app-id.ts)"
fi

export SLACK_APP_ID="$APP_ID"

deno run -q --config=deno.jsonc \
  --allow-read --allow-env --allow-run \
  scripts/cleanup-onboarding-triggers.ts "$@"
