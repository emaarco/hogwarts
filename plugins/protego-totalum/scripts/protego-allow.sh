#!/usr/bin/env bash
# protego-totalum — add one host to the sandbox network allowlist.
#
# Usage: protego-allow.sh <host> [--global]
#   default   → ./.claude/settings.json (this repo only)
#   --global  → ~/.claude/settings.json (every repo)
#
# Existing entries are kept; the host is appended once. Applies on the NEXT session.

set -euo pipefail

if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required but not installed." >&2
  exit 1
fi

HOST="${1:-}"
if [ -z "$HOST" ]; then
  echo "Usage: protego-allow.sh <host> [--global]" >&2
  exit 1
fi

TARGET="./.claude/settings.json"
[ "${2:-}" = "--global" ] && TARGET="$HOME/.claude/settings.json"

mkdir -p "$(dirname "$TARGET")"
[ -f "$TARGET" ] || echo '{}' > "$TARGET"

tmp="$(mktemp "${TARGET}.XXXXXX")"
jq --arg host "$HOST" \
  '.sandbox.network.allowedDomains = ((.sandbox.network.allowedDomains // []) + [$host] | unique)' \
  "$TARGET" > "$tmp"
mv "$tmp" "$TARGET"

echo "protego-totalum: allowed $HOST → $TARGET"
echo "Applies on your NEXT Claude Code session."
