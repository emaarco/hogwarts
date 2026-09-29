#!/usr/bin/env bash
# Sourced by clockify.sh — not executable on its own.

readonly NORMALIZE_ENTRY='
  '"$utc_to_epoch_jq"'
  def local(f): if . == null then null else (to_epoch | localtime | strftime(f)) end;
  {
    id,
    date: (.timeInterval.start | local("%Y-%m-%d")),
    start: (.timeInterval.start | local("%H:%M")),
    end: (.timeInterval.end | local("%H:%M")),
    hours: (if .timeInterval.end == null then null
            else (((.timeInterval.end | to_epoch) - (.timeInterval.start | to_epoch)) / 36 | round / 100) end),
    running: (.timeInterval.end == null),
    project: (.project.name // .projectId),
    projectId,
    task: (.task.name // .taskId),
    taskId,
    description,
    billable
  }'

normalize_entries() { TZ=$LOCAL_TZ jq "[ .[] | $NORMALIZE_ENTRY ] | sort_by(.date, .start)"; }
normalize_entry() { TZ=$LOCAL_TZ jq "$NORMALIZE_ENTRY"; }

print_output() {
  local json=$1 columns=$2
  if [[ "$OUTPUT_TABLE" == true ]]; then
    jq -r --arg columns "$columns" '
      ($columns | split(",")) as $keys
      | (if type == "array" then . else [.] end) as $rows
      | ($keys | join("\t")), ($rows[] | [ $keys[] as $k | (if .[$k] == null then "-" else .[$k] end) | tostring ] | join("\t"))
    ' <<<"$json" | column -t -s $'\t'
  else
    jq . <<<"$json"
  fi
}

readonly ENTRY_COLUMNS="id,date,start,end,hours,project,task,description,billable"
