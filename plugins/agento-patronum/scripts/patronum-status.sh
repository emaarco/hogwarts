#!/usr/bin/env bash
# agento-patronum — report which protection layers are active for this worktree.
# Usage: patronum-status.sh

set -euo pipefail

if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required but not installed." >&2
  exit 1
fi

CONFIG_DIR="$HOME/.claude"
PATRONUM_CONFIG="$CONFIG_DIR/patronum.json"
SEAL_CONFIG="$CONFIG_DIR/patronum-seal.json"
USER_SETTINGS="$CONFIG_DIR/settings.json"
PROJECT_SETTINGS="$PWD/.claude/settings.json"

case "$(uname -s)" in
  Darwin) MANAGED_PATH="/Library/Application Support/ClaudeCode/managed-settings.json" ;;
  *)      MANAGED_PATH="/etc/claude-code/managed-settings.json" ;;
esac

sandbox_state() {
  local f="$1"
  if [ ! -f "$f" ]; then echo "absent"; return; fi
  if ! jq empty "$f" 2>/dev/null; then echo "invalid-json"; return; fi
  if [ "$(jq -r '.sandbox.enabled // false' "$f")" = "true" ]; then echo "on"; else echo "off"; fi
}

echo "agento-patronum — protection status for: $PWD"
echo ""

echo "Static protection (patronum-hook, sensitive files & commands):"
if [ -f "$PATRONUM_CONFIG" ] && jq empty "$PATRONUM_CONFIG" 2>/dev/null; then
  echo "  active — $(jq '.entries | length' "$PATRONUM_CONFIG") protected patterns"
else
  echo "  inactive — config missing or invalid (~/.claude/patronum.json)"
fi
echo ""

echo "Seal · Layer 1 — native OS sandbox (settings.json sandbox.enabled):"
echo "  user     (~/.claude/settings.json):     $(sandbox_state "$USER_SETTINGS")"
echo "  project  (./.claude/settings.json):     $(sandbox_state "$PROJECT_SETTINGS")"
echo "  managed  ($MANAGED_PATH): $(sandbox_state "$MANAGED_PATH")"
echo ""

echo "Seal · Layer 2 — PreToolUse egress/boundary hook:"
if [ -f "$SEAL_CONFIG" ] && jq empty "$SEAL_CONFIG" 2>/dev/null; then
  if [ "$(jq -r '.enabled // true' "$SEAL_CONFIG")" = "true" ]; then
    echo "  active — $(jq '.commands | length' "$SEAL_CONFIG") egress command rules"
    echo "  WebFetch blocked: $(jq -r '.blockWebFetch // true' "$SEAL_CONFIG") · WebSearch blocked: $(jq -r '.blockWebSearch // true' "$SEAL_CONFIG") · worktree boundary: $(jq -r '.boundaryEnforcement // true' "$SEAL_CONFIG")"
  else
    echo "  present but disabled (.enabled=false in ~/.claude/patronum-seal.json)"
  fi
else
  echo "  inactive — config missing or invalid (~/.claude/patronum-seal.json)"
fi
echo ""
echo "Note: native sandbox changes apply on the NEXT session, not the current one."
