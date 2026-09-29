#!/usr/bin/env bash
# Sourced by clockify.sh — not executable on its own.

# The API key is handed to curl via stdin (-H @-): never in argv, URL, logs or files.
http_request() {
  local method=$1 path=$2 body=${3:-}
  local args=(-sS -X "$method" -H @- -H "Content-Type: application/json" -w $'\n%{http_code}')
  [[ -n "$body" ]] && args+=(--data-binary "$body")
  printf 'X-Api-Key: %s\n' "$CLOCKIFY_API_KEY" | curl "${args[@]}" "${CLOCKIFY_BASE%/}$path"
}

api() {
  local method=$1 path=$2 body=${3:-} response status
  response=$(http_request "$method" "$path" "$body") || die 1 "Netzwerkfehler bei $method $path"
  status=${response##*$'\n'}
  if [[ "$status" == 429 && "$method" == GET ]]; then
    sleep 2
    response=$(http_request "$method" "$path" "$body") || die 1 "Netzwerkfehler bei $method $path"
    status=${response##*$'\n'}
  fi
  response=${response%$'\n'*}
  if [[ "$status" != 2* ]]; then
    local message
    message=$(jq -r '.message // empty' <<<"$response" 2>/dev/null || true)
    die 1 "HTTP $status bei $method $path: ${message:-$response}"
  fi
  printf '%s' "$response"
}

api_all_pages() {
  local path=$1 separator page=1 chunk all='[]'
  [[ "$path" == *\?* ]] && separator='&' || separator='?'
  while :; do
    chunk=$(api GET "${path}${separator}page=${page}&page-size=${PAGE_SIZE}")
    all=$(jq -s 'add' <<<"$all$chunk")
    (($(jq length <<<"$chunk") < PAGE_SIZE)) && break
    page=$((page + 1))
  done
  printf '%s' "$all"
}
