#!/usr/bin/env bash
# agento-patronum — widen the seal for a project that legitimately needs it.
# Usage:
#   patronum-allow.sh --domain <host>   add host to ./.claude/settings.json sandbox allowlist
#   patronum-allow.sh --path <dir>      add dir to the hook boundary allowlist
#                                       (~/.claude/patronum-seal.json) and to the
#                                       project sandbox allowWrite list
#
# Domains/paths are de-duplicated. Sandbox changes apply on the next session.

set -euo pipefail

if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required but not installed." >&2
  exit 1
fi

KIND="${1:-}"
VALUE="${2:-}"
if [ -z "$KIND" ] || [ -z "$VALUE" ]; then
  echo "Usage: patronum-allow.sh --domain <host> | --path <dir>" >&2
  exit 1
fi

SEAL_CONFIG="$HOME/.claude/patronum-seal.json"
PROJECT_SETTINGS="$PWD/.claude/settings.json"

write_json() {
  # $1 = target file, $2 = jq filter, remaining = jq args
  local target="$1"; shift
  local filter="$1"; shift
  local tmp base
  base="{}"
  if [ -f "$target" ] && jq empty "$target" 2>/dev/null; then
    base="$(cat "$target")"
  fi
  mkdir -p "$(dirname "$target")"
  tmp="$(mktemp "${target}.XXXXXX")"
  echo "$base" | jq "$@" "$filter" > "$tmp"
  mv "$tmp" "$target"
}

case "$KIND" in
  --domain)
    write_json "$PROJECT_SETTINGS" \
      '.sandbox.network.allowedDomains = ((.sandbox.network.allowedDomains // []) + [$v] | unique)' \
      --arg v "$VALUE"
    echo "agento-patronum: allowed domain '$VALUE' → $PROJECT_SETTINGS"
    echo "Applies on your next Claude Code session."
    ;;
  --path)
    ABS="${VALUE/#\~/$HOME}"
    [[ "$ABS" != /* ]] && ABS="$PWD/$ABS"
    # Hook boundary allowlist
    write_json "$SEAL_CONFIG" \
      '.allowPaths = ((.allowPaths // []) + [$v] | unique)' \
      --arg v "$ABS"
    # Native sandbox write allowlist (project scope)
    write_json "$PROJECT_SETTINGS" \
      '.sandbox.filesystem.allowWrite = ((.sandbox.filesystem.allowWrite // []) + [$v] | unique)' \
      --arg v "$ABS"
    echo "agento-patronum: allowed path '$ABS'"
    echo "  · hook boundary   → $SEAL_CONFIG (effective immediately)"
    echo "  · sandbox write   → $PROJECT_SETTINGS (effective next session)"
    ;;
  *)
    echo "Unknown option '$KIND'. Use --domain or --path." >&2
    exit 1
    ;;
esac
