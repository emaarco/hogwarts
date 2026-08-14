#!/usr/bin/env bash
# agento-patronum — SessionStart hook
# Copies default config on first run. Safe to run every session.

set -euo pipefail

# Check for jq dependency
if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required but not installed." >&2
  echo "Install with:" >&2
  echo "  macOS:  brew install jq" >&2
  echo "  Linux:  apt install jq (Debian/Ubuntu) or yum install jq (RHEL/CentOS)" >&2
  echo "  WSL:    apt install jq" >&2
  exit 1
fi

CONFIG_DIR="$HOME/.claude"
CONFIG_FILE="$CONFIG_DIR/patronum.json"
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
if [ -z "${CLAUDE_PLUGIN_ROOT:-}" ]; then
  echo "agento-patronum: warning: CLAUDE_PLUGIN_ROOT not set, using fallback path: $PLUGIN_ROOT" >&2
fi
DEFAULTS="$PLUGIN_ROOT/defaults/patronum.json"
SEAL_FILE="$CONFIG_DIR/patronum-seal.json"
SEAL_DEFAULTS="$PLUGIN_ROOT/defaults/patronum-seal.json"
USER_SETTINGS="$CONFIG_DIR/settings.json"

mkdir -p "$CONFIG_DIR"

if [ ! -f "$CONFIG_FILE" ]; then
  cp "$DEFAULTS" "$CONFIG_FILE"
  echo "agento-patronum: first-time setup complete. Default protections installed."
fi

# Seed the seal (isolation) config — enforced by patronum-seal-hook.sh.
if [ ! -f "$SEAL_FILE" ] && [ -f "$SEAL_DEFAULTS" ]; then
  cp "$SEAL_DEFAULTS" "$SEAL_FILE"
  echo "agento-patronum: seal layer installed (egress + worktree boundary)."
fi

COUNT=$(jq '.entries | length' "$CONFIG_FILE")

# Report whether the native OS sandbox is configured at the user level.
NATIVE="off"
if [ -f "$USER_SETTINGS" ] && jq empty "$USER_SETTINGS" 2>/dev/null; then
  [ "$(jq -r '.sandbox.enabled // false' "$USER_SETTINGS")" = "true" ] && NATIVE="on"
fi

if [ "$NATIVE" = "on" ]; then
  echo "agento-patronum: protection active. $COUNT patterns · seal on (native sandbox: on)."
else
  echo "agento-patronum: protection active. $COUNT patterns · seal hook on (native sandbox: off — run /patronum-seal)."
fi
