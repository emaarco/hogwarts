#!/usr/bin/env bash
# agento-patronum — apply the native OS sandbox settings for a chosen tier.
# Usage: patronum-seal.sh <user|project|managed>
#
#   user     merge the sealed-by-default baseline into ~/.claude/settings.json
#   project  merge the project baseline into ./.claude/settings.json
#   managed  stage the hard-lock template and print the sudo install command
#
# Existing settings are deep-merged (never clobbered) with jq. Native sandbox
# changes take effect on the NEXT Claude Code session.

set -euo pipefail

if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required but not installed." >&2
  exit 1
fi

TIER="${1:-}"
if [ -z "$TIER" ]; then
  echo "Usage: patronum-seal.sh <user|project|managed>" >&2
  exit 1
fi

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
SETTINGS_DIR="$PLUGIN_ROOT/defaults/settings"

merge_into() {
  local template="$1" target="$2" dir tmp
  dir="$(dirname "$target")"
  mkdir -p "$dir"
  tmp="$(mktemp "${target}.XXXXXX")"
  if [ -f "$target" ] && jq empty "$target" 2>/dev/null; then
    jq -s '.[0] * .[1]' "$target" "$template" > "$tmp"
  else
    cp "$template" "$tmp"
  fi
  mv "$tmp" "$target"
  echo "agento-patronum: sealed → $target"
  echo "Native sandbox takes effect on your next Claude Code session."
}

case "$TIER" in
  user)
    merge_into "$SETTINGS_DIR/user-settings.json" "$HOME/.claude/settings.json"
    echo "Every repository you open is now sealed by default (network default-deny, writes confined to the worktree)."
    ;;
  project)
    merge_into "$SETTINGS_DIR/project-settings.json" "$PWD/.claude/settings.json"
    echo "This project is sealed. Widen its network allowlist with /patronum-allow."
    ;;
  managed)
    case "$(uname -s)" in
      Darwin) MANAGED_PATH="/Library/Application Support/ClaudeCode/managed-settings.json" ;;
      *)      MANAGED_PATH="/etc/claude-code/managed-settings.json" ;;
    esac
    STAGED="$HOME/.claude/patronum-managed-settings.json"
    cp "$SETTINGS_DIR/managed-settings.json" "$STAGED"
    echo "agento-patronum: hard-lock template staged at:"
    echo "  $STAGED"
    echo ""
    echo "This tier CANNOT be overridden by user/project settings. Install it with:"
    echo "  sudo mkdir -p \"$(dirname "$MANAGED_PATH")\""
    echo "  sudo cp \"$STAGED\" \"$MANAGED_PATH\""
    echo ""
    echo "Review it first — it locks the network allowlist and denies ~/.aws, ~/.ssh, ~/.kube."
    ;;
  *)
    echo "Unknown tier '$TIER'. Use: user | project | managed" >&2
    exit 1
    ;;
esac
