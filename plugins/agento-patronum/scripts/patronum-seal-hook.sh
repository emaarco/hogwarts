#!/usr/bin/env bash
# agento-patronum — PreToolUse isolation hook (the "seal" layer)
# Seals the worktree: blocks data egress (network commands, WebFetch/WebSearch)
# and boundary-crossing file access (reads/writes outside the current worktree).
# Complements patronum-hook.sh (static sensitive-file/command protection).
# Manage with: /patronum-allow /patronum-status

set -euo pipefail

if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required but not installed. agento-patronum cannot function." >&2
  exit 1
fi

# Fail closed if HOME is unset — no config path can be computed
if [ -z "${HOME:-}" ]; then
  echo "PATRONUM_SEAL: HOME is unset — blocking all tool calls as safe default" >&2
  exit 2
fi

SEAL_CONFIG="$HOME/.claude/patronum-seal.json"
SEAL_LOG="$HOME/.claude/patronum-seal.log"

# If no seal config exists, allow everything (seal is opt-in via /patronum-seal)
if [ ! -f "$SEAL_CONFIG" ]; then
  exit 0
fi

# Fail closed if config is not valid JSON
if ! jq empty "$SEAL_CONFIG" 2>/dev/null; then
  echo "PATRONUM_SEAL: config file is invalid JSON — blocking all tool calls as safe default" >&2
  exit 2
fi

# Master switch — seal enforcement can be toggled off without deleting config
if [ "$(jq -r '.enabled // true' "$SEAL_CONFIG")" != "true" ]; then
  exit 0
fi

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
if [ -z "$TOOL_NAME" ]; then
  exit 0
fi

# Session working directory (the worktree we are sealing)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
[ -z "$CWD" ] && CWD="$PWD"

# ── Helpers ───────────────────────────────────────────────────────────────────

# Lexically normalize a path (resolve . and .. without touching the filesystem,
# so it also works for files that do not exist yet, e.g. Write targets).
# Runs in a subshell with nounset disabled so empty arrays are safe on bash 3.2.
normalize_path() (
  set +u
  local path="$1"
  local IFS='/'
  local -a stack=()
  local p
  for p in $path; do
    case "$p" in
      '' | .) ;;
      ..) [ ${#stack[@]} -gt 0 ] && stack=("${stack[@]:0:$((${#stack[@]} - 1))}") ;;
      *) stack+=("$p") ;;
    esac
  done
  local out=""
  for p in "${stack[@]}"; do out="$out/$p"; done
  [ -z "$out" ] && out="/"
  printf '%s' "$out"
)

block_violation() {
  local TARGET="$1" RULE="$2" REASON="$3"
  jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg tool "$TOOL_NAME" \
    --arg target "$TARGET" --arg rule "$RULE" \
    '{ts:$ts,tool:$tool,target:$target,rule:$rule}' \
    >> "$SEAL_LOG" 2>/dev/null || true
  echo "PATRONUM_SEAL_VIOLATION: '$TARGET' blocked. Rule: $RULE" >&2
  [ -n "$REASON" ] && echo "Reason: $REASON" >&2
  echo "The worktree is sealed. Widen with /patronum-allow, or review with /patronum-status." >&2
  exit 2
}

within_boundary() {
  local abs="$1" cwd_norm
  cwd_norm=$(normalize_path "$CWD")
  if [[ "$abs" == "$cwd_norm" || "$abs" == "$cwd_norm/"* ]]; then
    return 0
  fi
  local ap ap_norm
  while IFS= read -r ap; do
    [ -z "$ap" ] && continue
    ap="${ap/#\~/$HOME}"
    ap_norm=$(normalize_path "$ap")
    if [[ "$abs" == "$ap_norm" || "$abs" == "$ap_norm/"* ]]; then
      return 0
    fi
  done < <(jq -r '.allowPaths[]? // empty' "$SEAL_CONFIG")
  return 1
}

check_boundary() {
  local RAW="$1"
  [ -z "$RAW" ] && return 0
  [ "$(jq -r '.boundaryEnforcement // true' "$SEAL_CONFIG")" != "true" ] && return 0
  local t="${RAW/#\~/$HOME}"
  [[ "$t" != /* ]] && t="$CWD/$t"
  local abs
  abs=$(normalize_path "$t")
  if ! within_boundary "$abs"; then
    block_violation "$RAW" "boundary(outside-worktree)" \
      "Access outside the sealed worktree ($CWD) is blocked to prevent cross-project leakage"
  fi
}

# ── Tool dispatch ─────────────────────────────────────────────────────────────

case "$TOOL_NAME" in
  WebFetch)
    [ "$(jq -r '.blockWebFetch // true' "$SEAL_CONFIG")" = "true" ] \
      && block_violation "WebFetch" "egress(WebFetch)" "Fetching external URLs can exfiltrate context"
    exit 0
    ;;
  WebSearch)
    [ "$(jq -r '.blockWebSearch // true' "$SEAL_CONFIG")" = "true" ] \
      && block_violation "WebSearch" "egress(WebSearch)" "Web search sends queries off the machine"
    exit 0
    ;;
  Read | Write | Edit)
    TARGET=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
    check_boundary "$TARGET"
    exit 0
    ;;
  MultiEdit)
    while IFS= read -r EDIT_PATH; do
      check_boundary "$EDIT_PATH"
    done < <(echo "$INPUT" | jq -r '.tool_input.edits[]?.file_path // empty')
    exit 0
    ;;
  Bash)
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
    [ -z "$COMMAND" ] && exit 0
    TRIMMED="${COMMAND#"${COMMAND%%[![:space:]]*}"}"

    # git push is fine to the repo's own origin, but pushing to any other remote
    # or a raw URL is an exfiltration path — block those.
    if [[ "$TRIMMED" == git\ push* || "$TRIMMED" == git\ push ]]; then
      REST="${TRIMMED#git push}"
      REMOTE=""
      # shellcheck disable=SC2086
      for tok in $REST; do
        case "$tok" in
          -*) continue ;;
          *) REMOTE="$tok"; break ;;
        esac
      done
      if [ -n "$REMOTE" ] && [ "$REMOTE" != "origin" ]; then
        block_violation "Bash($COMMAND)" "egress(git push → $REMOTE)" \
          "Pushing to a remote other than 'origin' can exfiltrate the repository"
      fi
      exit 0
    fi

    while IFS=$'\t' read -r PATTERN REASON; do
      [ -z "$PATTERN" ] && continue
      [[ "$PATTERN" == Bash\(*\) ]] || continue
      BLOCKED_CMD="${PATTERN#Bash(}"
      BLOCKED_CMD="${BLOCKED_CMD%)}"
      if [[ "$TRIMMED" == "$BLOCKED_CMD" || "$TRIMMED" == "$BLOCKED_CMD "* ]]; then
        block_violation "Bash($COMMAND)" "$PATTERN" "$REASON"
      fi
    done < <(jq -r '.commands[]? | [.pattern, .reason] | @tsv' "$SEAL_CONFIG")
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
