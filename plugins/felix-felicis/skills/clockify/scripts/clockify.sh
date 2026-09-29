#!/usr/bin/env bash
# Clockify CLI — official REST API only (curl + jq). See ../references/api.md.
# Exit codes: 0 ok · 1 API/HTTP error · 2 usage/environment · 3 name not resolvable (none/ambiguous) · 4 confirmation missing
set -euo pipefail

readonly LOCAL_TZ="Europe/Berlin"
readonly PAGE_SIZE=200

die() { local code=$1; shift; printf 'clockify: %s\n' "$*" >&2; exit "$code"; }
warn() { printf 'WARNUNG: %s\n' "$*" >&2; }

usage() {
  cat <<'EOF'
Usage: clockify.sh <command> [options]   (output JSON; add --table for a table)

Read:
  whoami | workspaces | tags
  projects [--name X]
  tasks <projectId|name>
  list --from YYYY-MM-DD --to YYYY-MM-DD
  today | week | last-week
  summary --from YYYY-MM-DD --to YYYY-MM-DD   (or: summary --week | --last-week)
  running

Write (need --yes; --dry-run shows the request body only):
  create --date YYYY-MM-DD --start HH:MM --end HH:MM --project <name|id>
         [--task <name|id>] [--desc TEXT] [--billable|--no-billable] [--dry-run|--yes]
  update <entryId> [--date] [--start] [--end] [--project] [--task] [--desc]
         [--billable|--no-billable] [--dry-run|--yes]
  start --project <name|id> [--task] [--desc] [--billable] [--dry-run|--yes]
  stop [--dry-run|--yes]
  delete <entryId> --confirm <entryId>

Times are local (Europe/Berlin); conversion to UTC happens here.
EOF
}

require_environment() {
  command -v jq >/dev/null || die 2 "jq fehlt. Installieren: brew install jq"
  command -v curl >/dev/null || die 2 "curl fehlt."
  local missing=() name
  for name in CLOCKIFY_API_KEY CLOCKIFY_BASE CLOCKIFY_WORKSPACE CLOCKIFY_USER_ID; do
    [[ -n "${!name:-}" ]] || missing+=("$name")
  done
  if ((${#missing[@]})); then
    echo "clockify: fehlende Umgebungsvariable(n): ${missing[*]}" >&2
    cat >&2 <<'EOF'
In ~/.zshrc setzen, z. B.:
  export CLOCKIFY_API_KEY="$(security find-generic-password -s clockify -w)"
  export CLOCKIFY_BASE="https://api.clockify.me/api/v1"   # EU: https://euc1.clockify.me/api/v1
  export CLOCKIFY_WORKSPACE="<workspace-id>"               # clockify.sh workspaces
  export CLOCKIFY_USER_ID="<user-id>"                      # clockify.sh whoami
Danach: source ~/.zshrc
EOF
    exit 2
  fi
}

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib"
readonly LIB_DIR
# shellcheck source=lib/http.sh
source "$LIB_DIR/http.sh"
# shellcheck source=lib/time.sh
source "$LIB_DIR/time.sh"
# shellcheck source=lib/format.sh
source "$LIB_DIR/format.sh"
# shellcheck source=lib/resolve.sh
source "$LIB_DIR/resolve.sh"
# shellcheck source=lib/commands.sh
source "$LIB_DIR/commands.sh"

# --- Argument parsing ----------------------------------------------------
OUTPUT_TABLE=false MODE=preview
OPT_FROM="" OPT_TO="" OPT_NAME="" OPT_DATE="" OPT_START="" OPT_END="" OPT_PROJECT="" OPT_TASK=""
OPT_DESC="" OPT_DESC_SET="" OPT_BILLABLE="" OPT_CONFIRM="" OPT_RANGE=""
POSITIONAL=()

parse_options() {
  while (($#)); do
    case $1 in
      --table) OUTPUT_TABLE=true ;;
      --dry-run) MODE=dry-run ;;
      --yes) MODE=confirmed ;;
      --billable) OPT_BILLABLE=true ;;
      --no-billable) OPT_BILLABLE=false ;;
      --week | --last-week) OPT_RANGE=${1#--} ;;
      --from | --to | --name | --date | --start | --end | --project | --task | --desc | --confirm)
        (($# >= 2)) || die 2 "$1 benötigt einen Wert"
        case $1 in
          --from) OPT_FROM=$2 ;; --to) OPT_TO=$2 ;; --name) OPT_NAME=$2 ;; --date) OPT_DATE=$2 ;;
          --start) OPT_START=$2 ;; --end) OPT_END=$2 ;; --project) OPT_PROJECT=$2 ;; --task) OPT_TASK=$2 ;;
          --desc) OPT_DESC=$2 OPT_DESC_SET=1 ;; --confirm) OPT_CONFIRM=$2 ;;
        esac
        shift ;;
      -h | --help) usage; exit 0 ;;
      -*) die 2 "Unbekannte Option: $1" ;;
      *) POSITIONAL+=("$1") ;;
    esac
    shift
  done
}

require_positional() { ((${#POSITIONAL[@]} == 1)) || die 2 "$1 erwartet genau ein Argument: $2"; }
require_range() { [[ -n "$OPT_FROM" && -n "$OPT_TO" ]] || die 2 "--from und --to (YYYY-MM-DD) erforderlich"; }

main() {
  (($#)) || { usage >&2; exit 2; }
  local command=$1; shift
  [[ "$command" == -h || "$command" == --help || "$command" == help ]] && { usage; exit 0; }
  parse_options "$@"
  require_environment

  local today monday
  today=$(today_local)
  monday=$(monday_of "$today")
  case $OPT_RANGE in
    week) OPT_FROM=$monday OPT_TO=$(shift_days "$monday" 6) ;;
    last-week) OPT_FROM=$(shift_days "$monday" -7) OPT_TO=$(shift_days "$monday" -1) ;;
  esac

  case $command in
    whoami) print_output "$(api GET /user | jq '{id, name, email, activeWorkspace, defaultWorkspace, timeZone: .settings.timeZone}')" id,name,email,activeWorkspace ;;
    workspaces) print_output "$(api GET /workspaces | jq 'map({id, name})')" id,name ;;
    tags) print_output "$(api_all_pages "/workspaces/$CLOCKIFY_WORKSPACE/tags?archived=false" | jq 'map({id, name})')" id,name ;;
    projects) print_output "$(fetch_projects "$OPT_NAME" | jq 'map({id, name, client: .clientName, billable})')" id,name,client,billable ;;
    tasks)
      require_positional tasks "<projectId|name>"
      print_output "$(fetch_tasks "$(resolve_project "${POSITIONAL[0]}")" | jq 'map({id, name, status})')" id,name,status ;;
    list) require_range; cmd_list "$OPT_FROM" "$OPT_TO" ;;
    today) cmd_list "$today" "$today" ;;
    week) cmd_list "$monday" "$(shift_days "$monday" 6)" ;;
    last-week) cmd_list "$(shift_days "$monday" -7)" "$(shift_days "$monday" -1)" ;;
    summary) require_range; cmd_summary "$OPT_FROM" "$OPT_TO" ;;
    running) print_output "$(fetch_running_entries | normalize_entries)" "$ENTRY_COLUMNS" ;;
    create) cmd_create ;;
    update) require_positional update "<entryId>"; cmd_update "${POSITIONAL[0]}" ;;
    start) cmd_start ;;
    stop) cmd_stop ;;
    delete) require_positional delete "<entryId>"; cmd_delete "${POSITIONAL[0]}" ;;
    *) usage >&2; die 2 "Unbekannter Befehl: $command" ;;
  esac
}

main "$@"
