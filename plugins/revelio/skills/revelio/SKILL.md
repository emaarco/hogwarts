---
name: revelio
description: Reveal recent failed tool calls, API errors, and permission denials from the per-repo Revelio log. Use when the user asks to see what went wrong, what failed, or runs /revelio.
allowed-tools: Bash(tail:*), Bash(wc:*), Bash(test:*), Read
---

# /revelio

Reveal the last N entries from the Revelio log, pretty-printed.

## Steps

### 1. Locate the log
Path: `${CLAUDE_PROJECT_DIR}/.claude/logs/revelio.jsonl`

### 2. Handle missing or empty log
If the file does not exist or is empty, reply with exactly:

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
- `summary`: first non-empty of `error`, `reason`, `stop_reason`, truncated to 80 chars

Show newest entries first.

### 6. Footer
Append one line: `N of TOTAL entries (total from \`wc -l\` on the log).`
