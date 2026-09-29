#!/usr/bin/env bash
# Sourced by clockify.sh — not executable on its own.

local_to_epoch() {
  local date=$1 time=$2
  [[ "$date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || die 2 "Datum '$date' nicht im Format YYYY-MM-DD"
  [[ "$time" =~ ^[0-9]{1,2}:[0-9]{2}$ ]] || die 2 "Zeit '$time' nicht im Format HH:MM"
  if date -j -f '%s' 0 >/dev/null 2>&1; then
    TZ=$LOCAL_TZ date -j -f '%Y-%m-%d %H:%M:%S' "$date $time:00" +%s 2>/dev/null
  else
    TZ=$LOCAL_TZ date -d "$date $time" +%s 2>/dev/null
  fi || die 2 "Ungültiges Datum/Zeit: $date $time"
}

epoch_to_utc() {
  if date -j -f '%s' 0 >/dev/null 2>&1; then date -u -r "$1" +%Y-%m-%dT%H:%M:%SZ; else date -u -d "@$1" +%Y-%m-%dT%H:%M:%SZ; fi
}

epoch_to_local() {
  local format=$2
  if date -j -f '%s' 0 >/dev/null 2>&1; then TZ=$LOCAL_TZ date -r "$1" "+$format"; else TZ=$LOCAL_TZ date -d "@$1" "+$format"; fi
}

local_to_utc() { epoch_to_utc "$(local_to_epoch "$1" "$2")"; }
today_local() { TZ=$LOCAL_TZ date +%Y-%m-%d; }
shift_days() { epoch_to_local $(($(local_to_epoch "$1" 12:00) + $2 * 86400)) %Y-%m-%d; }
monday_of() { shift_days "$1" $((1 - $(epoch_to_local "$(local_to_epoch "$1" 12:00)" %u))); }
utc_to_epoch_jq='def to_epoch: sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601;'
