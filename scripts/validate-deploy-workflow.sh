#!/usr/bin/env bash
# Structural contract tests for .github/workflows/deploy.yml.
# Exercises deploy workflow scenarios without live GitHub Secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKFLOW="$ROOT/.github/workflows/deploy.yml"
README="$ROOT/README.md"
CHECKLIST="$ROOT/docs/infrastructure-setup-checklist.md"
GITIGNORE="$ROOT/.gitignore"

fail() {
  echo "validate-deploy-workflow: $1" >&2
  exit 1
}

require_in_file() {
  local file="$1"
  local pattern="$2"
  local message="$3"
  grep -qE "$pattern" "$file" || fail "$message"
}

[[ -f "$WORKFLOW" ]] || fail "missing $WORKFLOW"

# Scenario: Manual deploy trigger (workflow_dispatch)
require_in_file "$WORKFLOW" '^on:' "$WORKFLOW must declare triggers"
require_in_file "$WORKFLOW" 'workflow_dispatch' "$WORKFLOW must support workflow_dispatch"

# Scenario: Agent-service deploy precedes slack-app deploy
require_in_file "$WORKFLOW" 'deploy-agent-service:' "$WORKFLOW must define deploy-agent-service job"
require_in_file "$WORKFLOW" 'deploy-slack-app:' "$WORKFLOW must define deploy-slack-app job"
require_in_file "$WORKFLOW" 'needs: validate-config' "deploy-agent-service must need validate-config"
require_in_file "$WORKFLOW" 'needs: deploy-agent-service' "deploy-slack-app must need deploy-agent-service"

# Scenario: Deploy fails on missing secrets (validate-config guard)
require_in_file "$WORKFLOW" 'validate-config:' "$WORKFLOW must define validate-config job"
require_in_file "$WORKFLOW" 'check_secret LLM_API_KEY' "validate-config must check LLM_API_KEY"
require_in_file "$WORKFLOW" 'check_secret SLACK_SERVICE_TOKEN' "validate-config must check SLACK_SERVICE_TOKEN"
require_in_file "$WORKFLOW" 'check_secret RENDER_API_KEY' "validate-config must check RENDER_API_KEY"
require_in_file "$WORKFLOW" 'check_secret RENDER_DEPLOY_HOOK_URL' "validate-config must check RENDER_DEPLOY_HOOK_URL"
require_in_file "$WORKFLOW" 'check_var AGENT_SERVICE_URL' "validate-config must check AGENT_SERVICE_URL"
require_in_file "$WORKFLOW" 'check_var LLM_BASE_URL' "validate-config must check LLM_BASE_URL"
require_in_file "$WORKFLOW" 'check_var LLM_MODEL' "validate-config must check LLM_MODEL"
require_in_file "$WORKFLOW" 'check_var RENDER_SERVICE_ID' "validate-config must check RENDER_SERVICE_ID"

# Scenario: LLM config deployed from GitHub (Render env sync)
require_in_file "$WORKFLOW" 'Sync Render environment variables' "$WORKFLOW must sync Render env vars"
require_in_file "$WORKFLOW" 'LLM_API_KEY' "Render sync must include LLM_API_KEY"
require_in_file "$WORKFLOW" 'LLM_BASE_URL' "Render sync must include LLM_BASE_URL"
require_in_file "$WORKFLOW" 'LLM_MODEL' "Render sync must include LLM_MODEL"
require_in_file "$WORKFLOW" 'api\.render\.com/v1/services/\$\{RENDER_SERVICE_ID\}/env-vars' \
  "Render sync must call Render env-vars API"

# Scenario: Agent-service build verified before Render deploy
require_in_file "$WORKFLOW" 'Verify agent-service build' \
  "$WORKFLOW must run npm build before Render deploy"
require_in_file "$WORKFLOW" 'npm run build' \
  "deploy-agent-service must run npm run build"

# Scenario: Render deploy completion verified via API (not health-only)
require_in_file "$WORKFLOW" 'Trigger Render deploy and wait for completion' \
  "$WORKFLOW must wait for Render deploy completion"
require_in_file "$WORKFLOW" 'Wait for agent-service health check' "$WORKFLOW must health-check agent-service"
require_in_file "$WORKFLOW" '/health' "$WORKFLOW must curl /health"

# Scenario: slack-app AGENT_SERVICE_URL via slack env set
require_in_file "$WORKFLOW" 'slack env set AGENT_SERVICE_URL' \
  "deploy-slack-app must set AGENT_SERVICE_URL via slack env set"
require_in_file "$WORKFLOW" 'slack deploy' "deploy-slack-app must run slack deploy"

# Scenario: Provision Slack triggers step references existing scripts
require_in_file "$WORKFLOW" 'Provision Slack triggers' \
  "$WORKFLOW must define Provision Slack triggers step"
require_in_file "$WORKFLOW" '\./scripts/provision-triggers\.sh' \
  "$WORKFLOW must invoke slack-app/scripts/provision-triggers.sh"

PROVISION_SCRIPT="$ROOT/slack-app/scripts/provision-triggers.sh"
PROVISION_TS="$ROOT/slack-app/scripts/provision-triggers.ts"
TRIGGERS_CONFIG="$ROOT/slack-app/triggers.config.yaml"

[[ -f "$PROVISION_SCRIPT" ]] || fail "missing $PROVISION_SCRIPT (referenced by deploy workflow)"
[[ -x "$PROVISION_SCRIPT" ]] || fail "$PROVISION_SCRIPT must be executable"
[[ -f "$PROVISION_TS" ]] || fail "missing $PROVISION_TS (invoked by provision-triggers.sh)"
[[ -f "$TRIGGERS_CONFIG" ]] || fail "missing $TRIGGERS_CONFIG (read by provision-triggers.ts)"

# Scenario: Secrets inventory documented
for doc in "$README" "$CHECKLIST"; do
  [[ -f "$doc" ]] || fail "missing documentation file: $doc"
  for key in LLM_API_KEY SLACK_SERVICE_TOKEN RENDER_API_KEY RENDER_DEPLOY_HOOK_URL \
    AGENT_SERVICE_URL LLM_BASE_URL LLM_MODEL RENDER_SERVICE_ID; do
    require_in_file "$doc" "$key" "$doc must document $key"
  done
done

# Scenario: Secrets not committed (.env gitignored)
require_in_file "$GITIGNORE" '^\.env$' ".gitignore must ignore .env"
require_in_file "$GITIGNORE" '^\.env\.\*$' ".gitignore must ignore .env.*"

echo "validate-deploy-workflow: all contract checks passed"

