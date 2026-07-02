---
name: revelio
description: Reveal recent failed tool calls, API errors, and permission denials from the per-repo Revelio log. Use when the user asks to see what went wrong, what failed, or runs /revelio.
allowed-tools: Bash(tail:*), Bash(wc:*), Bash(test:*), Bash(git rev-parse:*), Read
---

# /revelio

Reveal the last N entries from the Revelio log, pretty-printed.

## Steps

### 1. Locate the log
Resolve the project root yourself — `$CLAUDE_PROJECT_DIR` is only set for hook processes, not for these commands. Use it if set, otherwise `git rev-parse --show-toplevel`, otherwise the current working directory. The log is `<project root>/.claude/logs/revelio.jsonl`.

### 2. Handle missing or empty log
If the file does not exist or is empty (`test -s` fails), check the shared fallback log `$HOME/.claude/logs/revelio.jsonl` (the hook writes there when it has no project dir). If it has entries, continue with that file and note in the output that entries come from the shared fallback log. If both are missing or empty, reply with exactly:

> Nothing to reveal — the log is quiet.

Then stop.

### 3. Determine N
Default N = 20. If the user specified a number in the prompt (e.g. "show me the last 50"), use that.

### 4. Read the last N lines
Run `tail -n <N>` on the log, then parse each line as JSON.

### 5. Render a compact table
Columns: `time` | `event` | `tool` | `summary`

- `time`: `HH:MM:SS` extracted from `timestamp`
- `event`: short event name (`PostToolUseFailure` → `ToolFail`, `StopFailure` → `APIFail`, `PermissionDenied` → `Denied`)
- `tool`: `tool_name` if present, else `—`
- `summary`: first non-empty of `error`, `reason`, `stop_reason`, truncated to 80 chars; if the value is not a string (e.g. a structured `error` object), JSON-stringify it before truncating

Show newest entries first.

### 6. Footer
Append one line in the form `N of TOTAL entries`, where TOTAL is obtained via `wc -l` on the log.
