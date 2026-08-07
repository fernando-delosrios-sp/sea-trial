#!/usr/bin/env bash
# Provision Slack workflow triggers from triggers.config.yaml (idempotent).
#
# Required env:
#   SLACK_SERVICE_TOKEN — CLI service token (same as slack deploy)
#
# Optional env:
#   SLACK_APP_ID        — override app id (default: read from .slack/apps.json)
#   SLACK_TRIGGER_CHANNEL_IDS — comma-separated channel IDs for channel-scoped entries
#
# Usage (from slack-app/):
#   ./scripts/provision-triggers.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -z "${SLACK_SERVICE_TOKEN:-}" ]; then
  echo "Missing SLACK_SERVICE_TOKEN" >&2
  exit 1
fi

APP_ID="${SLACK_APP_ID:-}"
if [ -z "$APP_ID" ]; then
  APP_ID="$(deno run -q --allow-read scripts/read-app-id.ts)"
fi

export SLACK_APP_ID="$APP_ID"

deno run -q --config=deno.jsonc \
  --allow-read --allow-env --allow-run \
  scripts/provision-triggers.ts
