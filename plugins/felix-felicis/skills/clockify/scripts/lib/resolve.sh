#!/usr/bin/env bash
# Sourced by clockify.sh — not executable on its own.

is_object_id() { [[ "$1" =~ ^[0-9a-f]{24}$ ]]; }

pick_single_match() {
  local kind=$1 query=$2 candidates=$3 matches count
  matches=$(jq --arg q "$query" '
    ($q | ascii_downcase) as $needle
    | [ .[] | select(.name | ascii_downcase | contains($needle)) ] as $partial
    | [ $partial[] | select((.name | ascii_downcase) == $needle) ] as $exact
    | if ($exact | length) == 1 then $exact else $partial end
    | map({id, name})' <<<"$candidates")
  count=$(jq length <<<"$matches")
  if ((count == 0)); then
    die 3 "Kein $kind passt zu '$query'."
  elif ((count > 1)); then
    {
      echo "clockify: '$query' ist mehrdeutig — $count ${kind}-Treffer. Bitte genauer angeben oder ID verwenden:"
      jq -r '.[] | "  \(.id)  \(.name)"' <<<"$matches"
    } >&2
    exit 3
  fi
  jq -r '.[0].id' <<<"$matches"
}

fetch_projects() { api_all_pages "/workspaces/$CLOCKIFY_WORKSPACE/projects?archived=false${1:+&name=$(jq -rn --arg v "$1" '$v|@uri')}"; }
fetch_tasks() { api_all_pages "/workspaces/$CLOCKIFY_WORKSPACE/projects/$1/tasks"; }

resolve_project() {
  is_object_id "$1" && { printf '%s' "$1"; return; }
  pick_single_match Projekt "$1" "$(fetch_projects "")"
}

resolve_task() {
  local project_id=$1 query=$2
  is_object_id "$query" && { printf '%s' "$query"; return; }
  pick_single_match Task "$query" "$(fetch_tasks "$project_id")"
}
