#!/usr/bin/env bash
# protego-totalum — initialise the "always global" native-sandbox best practice.
#
# Merges a strict, network-default-deny sandbox baseline into ~/.claude/settings.json
# so every repo you open is isolated by Claude Code's own OS-enforced sandbox
# (filesystem confined to the worktree, network default-deny).
#
# Existing settings are deep-merged with jq — never clobbered. The native sandbox
# takes effect on the NEXT Claude Code session.

set -euo pipefail

if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required but not installed." >&2
  echo "Install with: brew install jq (macOS) · apt install jq (Debian/Ubuntu/WSL)" >&2
  exit 1
fi

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
TEMPLATE="$PLUGIN_ROOT/defaults/settings.json"
TARGET="$HOME/.claude/settings.json"

if [ ! -f "$TEMPLATE" ] || ! jq empty "$TEMPLATE" 2>/dev/null; then
  echo "ERROR: baseline template missing or invalid: $TEMPLATE" >&2
  exit 1
fi

mkdir -p "$(dirname "$TARGET")"
tmp="$(mktemp "${TARGET}.XXXXXX")"
if [ -f "$TARGET" ] && jq empty "$TARGET" 2>/dev/null; then
  jq -s '.[0] * .[1]' "$TARGET" "$TEMPLATE" > "$tmp"
else
  cp "$TEMPLATE" "$tmp"
fi
mv "$tmp" "$TARGET"

echo "protego-totalum: sealed globally → $TARGET"
echo "Every repo you open is now sandboxed (network default-deny, writes confined to the worktree)."
echo "Applies on your NEXT Claude Code session."
echo ""
echo "Need the network in a project that legitimately requires it? Add the host to"
echo "  ./.claude/settings.json → sandbox.network.allowedDomains  (e.g. registry.npmjs.org)"
echo "That widens the seal for that one repo, on its next session."
