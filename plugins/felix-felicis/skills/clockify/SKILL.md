---
name: clockify
description: "Read and book Clockify time entries via the official REST API. ALWAYS use this skill for anything about time tracking, timesheets, booked hours, or Clockify — e.g. 'what did I book this week', 'log 2h on project X', 'start/stop a timer'. Deutsch: IMMER verwenden bei Zeit buchen, Stunden eintragen, Zeiterfassung, 'was habe ich diese Woche gebucht', 'trag mir 2h auf Projekt X ein', Timer starten/stoppen, Eintrag ändern, Stunden prüfen oder korrigieren."
allowed-tools: Bash, AskUserQuestion
---

# Skill: clockify

Reads and writes the user's Clockify time entries using only the official Clockify REST API. All calls go through one script:

```bash
CLOCKIFY="${CLAUDE_PLUGIN_ROOT}/skills/clockify/scripts/clockify.sh"
```

Endpoints the script uses are listed in [`references/api.md`](references/api.md). For anything else, query the official OpenAPI spec (https://docs.clockify.me/openapi.json) with `jq` as shown there, and never load the full spec into context. The script itself is split into `scripts/lib/` modules (http, time, format, resolve, commands). Run it; don't read it into context.

## Environment

The script reads four variables, which the user sets in `~/.zshrc` (the key comes from the macOS Keychain):

| Variable | Meaning |
|---|---|
| `CLOCKIFY_API_KEY` | API key, sent as the `X-Api-Key` header |
| `CLOCKIFY_BASE` | `https://api.clockify.me/api/v1` (EU: `https://euc1.clockify.me/api/v1`) |
| `CLOCKIFY_WORKSPACE` | Workspace ID (`clockify.sh workspaces`) |
| `CLOCKIFY_USER_ID` | User ID (`clockify.sh whoami`) |

If a variable is missing, the script exits with code 2 and names the variable. Relay that message to the user as-is. Do not suggest config files with plaintext keys, and never ask the user to paste the key into the chat.

## Safety rules (non-negotiable)

1. **Never expose the API key.** Do not echo it, log it, write it to files, or put it in URLs. Do not use `set -x` or print headers. Do not run `env`, `printenv` or `echo $CLOCKIFY_API_KEY`.
2. **Reads** (list, today, week, summary, projects, …) can run without asking.
3. **Writes** (`create`, `update`, `start`, `stop`) always go through `--dry-run` first. Show the preview as a table with date, start, end, duration, project, task and description. Then wait for an explicit **"ja"** or "yes" from the user, and only after that run the same command again with `--yes`. Without `--yes`, the script refuses to write (exit 4).
4. **Delete** only when the user explicitly asks. First show the full entry, then ask the user to confirm the **entry ID**, and call `delete <id> --confirm <id>`. Delete one entry at a time and never loop over several.
5. After every write the script reads the entry back with GET and prints it. Show that result to the user.
6. Before `create` and `update`, the script warns on stderr about overlaps or duplicates on the same day. Always pass these warnings on to the user in the preview.

## Workflow

1. **Check the environment:** on first use, run `"$CLOCKIFY" whoami --table`. If it exits with 2, relay the message and stop.
2. **Resolve the project and task:** `--project` and `--task` accept a name (case-insensitive, substring match) or an ID.
   - Exit 3 means the name is ambiguous or unknown. The script lists the candidates on stderr. **Ask the user** which one they mean (AskUserQuestion) and do not guess. Then continue with the ID.
3. **Preview:** run the command with `--dry-run` and present `preview` plus any warnings as a table.
4. **Confirm:** wait for an explicit "ja" or "yes". Anything else means do not write.
5. **Write:** run the same command with `--yes`.
6. **Read back:** show the entry the script printed after the write.

Times are always **local (Europe/Berlin)**. The script converts them to UTC and handles daylight saving time, so never convert times yourself. Output is local time as well.

## Commands

Output is JSON by default. Add `--table` for a readable table.

| Command | Purpose |
|---|---|
| `whoami` / `workspaces` / `tags` | User, workspaces, tags |
| `projects [--name X]` | Active projects (all pages) |
| `tasks <project>` | Tasks of a project |
| `list --from YYYY-MM-DD --to YYYY-MM-DD` | Entries in a range, including both days |
| `today` / `week` / `last-week` | Shortcuts (weeks run Monday to Sunday) |
| `summary --from … --to …` or `summary --week` / `--last-week` | Totals per project, and per day and project |
| `running` | Currently running timer |
| `create --date --start HH:MM --end HH:MM --project P [--task T] [--desc D] [--billable]` | New entry |
| `update <id> [--date] [--start] [--end] [--project] [--task] [--desc] [--billable\|--no-billable]` | Changes only the given fields. The script GETs the entry, merges, then sends a PUT |
| `start --project P [--task T] [--desc D]` | Starts a timer. Clockify stops any timer that is already running and the script warns about it |
| `stop` | Stops the running timer |
| `delete <id> --confirm <id>` | Deletes one entry |

Every write command also takes `--dry-run` or `--yes`.

**Exit codes:** `0` ok · `1` API/HTTP error (the status and Clockify message are on stderr) · `2` usage or environment · `3` project/task ambiguous or not found · `4` confirmation missing.

On HTTP 429, GET requests are retried once after 2 seconds. Writes are **never** retried automatically. If a write fails, show the error and ask the user how to proceed.

## Examples

**"Was habe ich letzte Woche gebucht? Summe pro Projekt."**
```bash
"$CLOCKIFY" summary --last-week --table
```

**"Trag mir heute 9:00–11:30 auf Projekt 'Intern' ein, Beschreibung 'Weekly Planning'."**
```bash
"$CLOCKIFY" create --date "$(TZ=Europe/Berlin date +%F)" --start 09:00 --end 11:30 --project Intern --desc "Weekly Planning" --dry-run
# → show preview + warnings as a table, wait for "ja", then the same command with --yes
```

**"Ändere die Beschreibung meines letzten Eintrags auf 'Kundencall Müller'."**
```bash
"$CLOCKIFY" week          # last entry = the latest date/start; if the week is empty, check last-week
"$CLOCKIFY" update <id> --desc "Kundencall Müller" --dry-run   # preview shows before/after → "ja" → --yes
```

**Timer:** `"$CLOCKIFY" start --project X --dry-run`, then after "ja" run it with `--yes`. Stopping works the same way: `stop --dry-run`, then `stop --yes`.

## Later (not implemented yet)

These extensions are planned. Each would be added as a new subcommand in `scripts/clockify.sh` plus its own section here:
- Turn Outlook calendar entries into booking suggestions, which still go through the preview and confirmation flow above.
- A weekly check for missing hours: compare target hours per day against `summary`.
