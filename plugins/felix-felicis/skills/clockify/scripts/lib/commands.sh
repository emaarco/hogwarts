#!/usr/bin/env bash
# Sourced by clockify.sh — not executable on its own.

fetch_entries_between() {
  local from=$1 to=$2 start end
  start=$(local_to_utc "$from" 00:00)
  end=$(local_to_utc "$(shift_days "$to" 1)" 00:00)
  api_all_pages "/workspaces/$CLOCKIFY_WORKSPACE/user/$CLOCKIFY_USER_ID/time-entries?start=$start&end=$end&hydrated=true"
}

fetch_entry() { api GET "/workspaces/$CLOCKIFY_WORKSPACE/time-entries/$1?hydrated=true"; }

fetch_running_entries() {
  api GET "/workspaces/$CLOCKIFY_WORKSPACE/user/$CLOCKIFY_USER_ID/time-entries?in-progress=true&hydrated=true"
}

warn_about_conflicts() {
  local date=$1 start_utc=$2 end_utc=$3 project_id=$4 description=$5 ignore_id=${6:-} now_utc
  now_utc=$(epoch_to_utc "$(date +%s)")
  local conflicts
  conflicts=$(fetch_entries_between "$date" "$date" | TZ=$LOCAL_TZ jq \
    --arg s "$start_utc" --arg e "${end_utc:-$now_utc}" --arg now "$now_utc" \
    --arg pid "$project_id" --arg desc "$description" --arg ignore "$ignore_id" "
    $utc_to_epoch_jq
    [ .[] | select(.id != \$ignore)
      | . as \$entry
      | (.timeInterval.start | to_epoch) as \$es
      | ((.timeInterval.end // \$now) | to_epoch) as \$ee
      | (\$s | to_epoch) as \$ns | (\$e | to_epoch) as \$ne
      | select(\$ns < \$ee and \$es < \$ne)
      | (\$entry | $NORMALIZE_ENTRY)
        + { conflict: (if (\$ns == \$es and \$ne == \$ee) or (\$entry.projectId == \$pid and \$entry.description == \$desc)
                       then \"Duplikat\" else \"Überschneidung\" end) } ]")
  if (($(jq length <<<"$conflicts"))); then
    warn "Konflikt(e) mit bestehenden Einträgen am $date:"
    jq -r '.[] | "  [\(.conflict)] \(.id)  \(.start)–\(.end // "läuft")  \(.project // "-")  \(.description // "")"' <<<"$conflicts" >&2
  fi
}

show_body_and_stop_unless_confirmed() {
  local body=$1 preview=$2
  if [[ "$MODE" == dry-run ]]; then
    jq -n --argjson body "$body" --argjson preview "$preview" '{dryRun: true, preview: $preview, requestBody: $body}'
    exit 0
  fi
  if [[ "$MODE" != confirmed ]]; then
    jq -n --argjson preview "$preview" '{preview: $preview}' >&2
    die 4 "Schreiben erfordert --yes (nach expliziter Bestätigung durch den Nutzer)."
  fi
}

cmd_list() {
  local from=$1 to=$2
  print_output "$(fetch_entries_between "$from" "$to" | normalize_entries)" "$ENTRY_COLUMNS"
}

cmd_summary() {
  local from=$1 to=$2 summary
  summary=$(fetch_entries_between "$from" "$to" | normalize_entries | jq --arg from "$from" --arg to "$to" '
    map(select(.hours != null)) as $done
    | {
        from: $from, to: $to,
        totalHours: ($done | map(.hours) | add // 0 | . * 100 | round / 100),
        byProject: ($done | group_by(.project) | map({project: .[0].project, hours: (map(.hours) | add | . * 100 | round / 100)}) | sort_by(-.hours)),
        byDay: ($done | group_by(.date) | map({
          date: .[0].date,
          hours: (map(.hours) | add | . * 100 | round / 100),
          projects: (group_by(.project) | map({project: .[0].project, hours: (map(.hours) | add | . * 100 | round / 100)}))
        }))
      }')
  if [[ "$OUTPUT_TABLE" == true ]]; then
    echo "Summe $from – $to: $(jq .totalHours <<<"$summary") h"
    echo; echo "Pro Projekt:"; OUTPUT_TABLE=true print_output "$(jq .byProject <<<"$summary")" project,hours
    echo; echo "Pro Tag und Projekt:"
    print_output "$(jq '[.byDay[] | .date as $d | .projects[] | {date: $d, project, hours}]' <<<"$summary")" date,project,hours
  else
    jq . <<<"$summary"
  fi
}

cmd_create() {
  [[ -n "$OPT_DATE" && -n "$OPT_START" && -n "$OPT_END" && -n "$OPT_PROJECT" ]] \
    || die 2 "create benötigt --date, --start, --end und --project"
  local start_utc end_utc project_id task_id=""
  start_utc=$(local_to_utc "$OPT_DATE" "$OPT_START")
  end_utc=$(local_to_utc "$OPT_DATE" "$OPT_END")
  [[ "$end_utc" > "$start_utc" ]] || die 2 "Ende ($OPT_END) muss nach Start ($OPT_START) liegen"
  project_id=$(resolve_project "$OPT_PROJECT")
  [[ -n "$OPT_TASK" ]] && task_id=$(resolve_task "$project_id" "$OPT_TASK")

  warn_about_conflicts "$OPT_DATE" "$start_utc" "$end_utc" "$project_id" "$OPT_DESC"

  local body preview
  body=$(jq -n --arg start "$start_utc" --arg end "$end_utc" --arg pid "$project_id" --arg tid "$task_id" \
    --arg desc "$OPT_DESC" --argjson billable "${OPT_BILLABLE:-false}" \
    '{start: $start, end: $end, projectId: $pid, description: $desc, billable: $billable}
     + (if $tid == "" then {} else {taskId: $tid} end)')
  preview=$(jq -n --arg date "$OPT_DATE" --arg start "$OPT_START" --arg end "$OPT_END" \
    --arg hours "$((($(local_to_epoch "$OPT_DATE" "$OPT_END") - $(local_to_epoch "$OPT_DATE" "$OPT_START")) / 60))" \
    --arg project "$OPT_PROJECT" --arg pid "$project_id" --arg task "$OPT_TASK" --arg desc "$OPT_DESC" \
    --argjson billable "${OPT_BILLABLE:-false}" \
    '{date: $date, start: $start, end: $end, hours: (($hours | tonumber) / 60 * 100 | round / 100),
      project: $project, projectId: $pid, task: $task, description: $desc, billable: $billable}')
  show_body_and_stop_unless_confirmed "$body" "$preview"

  local created_id
  created_id=$(api POST "/workspaces/$CLOCKIFY_WORKSPACE/time-entries" "$body" | jq -r .id)
  print_output "$(fetch_entry "$created_id" | normalize_entry)" "$ENTRY_COLUMNS"
}

cmd_update() {
  local entry_id=$1 existing
  existing=$(fetch_entry "$entry_id")
  local current
  current=$(normalize_entry <<<"$existing")
  [[ "$(jq -r .running <<<"$current")" == false ]] || die 2 "Eintrag $entry_id läuft noch — erst stoppen."

  local date start end project_id task_id description billable
  date=${OPT_DATE:-$(jq -r .date <<<"$current")}
  start=${OPT_START:-$(jq -r .start <<<"$current")}
  end=${OPT_END:-$(jq -r .end <<<"$current")}
  project_id=$(jq -r '.projectId // ""' <<<"$existing")
  task_id=$(jq -r '.taskId // ""' <<<"$existing")
  if [[ -n "$OPT_PROJECT" ]]; then
    project_id=$(resolve_project "$OPT_PROJECT")
    task_id=""
  fi
  [[ -n "$OPT_TASK" ]] && task_id=$(resolve_task "$project_id" "$OPT_TASK")
  description=${OPT_DESC_SET:+$OPT_DESC}
  [[ -n "$OPT_DESC_SET" ]] || description=$(jq -r '.description // ""' <<<"$existing")
  billable=${OPT_BILLABLE:-$(jq -r '.billable // false' <<<"$existing")}

  local start_utc end_utc
  start_utc=$(local_to_utc "$date" "$start")
  end_utc=$(local_to_utc "$date" "$end")
  [[ "$end_utc" > "$start_utc" ]] || die 2 "Ende ($end) muss nach Start ($start) liegen"
  if [[ -n "$OPT_DATE$OPT_START$OPT_END" ]]; then
    warn_about_conflicts "$date" "$start_utc" "$end_utc" "$project_id" "$description" "$entry_id"
  fi

  local body preview
  body=$(jq --arg start "$start_utc" --arg end "$end_utc" --arg pid "$project_id" --arg tid "$task_id" \
    --arg desc "$description" --argjson billable "$billable" '
    {start: $start, end: $end, billable: $billable, description: $desc,
     projectId: (if $pid == "" then null else $pid end),
     taskId: (if $tid == "" then null else $tid end),
     tagIds: (.tagIds // []), type: (.type // "REGULAR")}' <<<"$existing")
  preview=$(jq -n --argjson before "$current" --arg date "$date" --arg start "$start" --arg end "$end" \
    --arg pid "$project_id" --arg tid "$task_id" --arg desc "$description" --argjson billable "$billable" \
    '{before: $before, after: {date: $date, start: $start, end: $end, projectId: $pid, taskId: $tid, description: $desc, billable: $billable}}')
  show_body_and_stop_unless_confirmed "$body" "$preview"

  api PUT "/workspaces/$CLOCKIFY_WORKSPACE/time-entries/$entry_id" "$body" >/dev/null
  print_output "$(fetch_entry "$entry_id" | normalize_entry)" "$ENTRY_COLUMNS"
}

cmd_start() {
  [[ -n "$OPT_PROJECT" ]] || die 2 "start benötigt --project"
  local project_id task_id="" now_utc running
  project_id=$(resolve_project "$OPT_PROJECT")
  [[ -n "$OPT_TASK" ]] && task_id=$(resolve_task "$project_id" "$OPT_TASK")
  running=$(fetch_running_entries | normalize_entries)
  if (($(jq length <<<"$running"))); then
    warn "Es läuft bereits ein Timer — Clockify stoppt ihn beim Start eines neuen:"
    jq -r '.[] | "  \(.id)  seit \(.start)  \(.project // "-")  \(.description // "")"' <<<"$running" >&2
  fi
  now_utc=$(epoch_to_utc "$(date +%s)")
  local body preview
  body=$(jq -n --arg start "$now_utc" --arg pid "$project_id" --arg tid "$task_id" --arg desc "$OPT_DESC" \
    --argjson billable "${OPT_BILLABLE:-false}" \
    '{start: $start, projectId: $pid, description: $desc, billable: $billable} + (if $tid == "" then {} else {taskId: $tid} end)')
  preview=$(jq -n --arg start "$(epoch_to_local "$(date +%s)" '%Y-%m-%d %H:%M')" --arg project "$OPT_PROJECT" \
    --arg pid "$project_id" --arg task "$OPT_TASK" --arg desc "$OPT_DESC" \
    '{timerStart: $start, project: $project, projectId: $pid, task: $task, description: $desc}')
  show_body_and_stop_unless_confirmed "$body" "$preview"

  local created_id
  created_id=$(api POST "/workspaces/$CLOCKIFY_WORKSPACE/time-entries" "$body" | jq -r .id)
  print_output "$(fetch_entry "$created_id" | normalize_entry)" "$ENTRY_COLUMNS"
}

cmd_stop() {
  local running
  running=$(fetch_running_entries)
  (($(jq length <<<"$running"))) || die 2 "Kein laufender Timer."
  local running_id end_utc body
  running_id=$(jq -r '.[0].id' <<<"$running")
  end_utc=$(epoch_to_utc "$(date +%s)")
  body=$(jq -n --arg end "$end_utc" '{end: $end}')
  show_body_and_stop_unless_confirmed "$body" "$(jq '.[0]' <<<"$running" | normalize_entry)"

  api PATCH "/workspaces/$CLOCKIFY_WORKSPACE/user/$CLOCKIFY_USER_ID/time-entries" "$body" >/dev/null
  print_output "$(fetch_entry "$running_id" | normalize_entry)" "$ENTRY_COLUMNS"
}

cmd_delete() {
  local entry_id=$1 entry
  entry=$(fetch_entry "$entry_id" | normalize_entry)
  if [[ "$OPT_CONFIRM" != "$entry_id" ]]; then
    jq . <<<"$entry" >&2
    die 4 "Löschen erfordert --confirm $entry_id (identische Eintrags-ID)."
  fi
  api DELETE "/workspaces/$CLOCKIFY_WORKSPACE/time-entries/$entry_id" >/dev/null
  jq -n --argjson deleted "$entry" '{deleted: $deleted}'
}
