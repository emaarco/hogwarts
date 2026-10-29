---
name: revelio
description: "List recent failed tool calls, rejections, auto-mode denials and API errors from this repo's Claude Code transcripts."
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git rev-parse:*)
---

# /revelio

Reveal the latest failures in this repo, read straight from Claude Code's session transcripts.

## Steps

### 1. Resolve the project root
Use `git rev-parse --show-toplevel`, otherwise the current working directory. Transcripts are stored per project root, so a git worktree has its own.

### 2. Read the failures
Default limit is 20. Take a different number, a session id, or a time range from the user's prompt and pass them on. Turn relative ranges ("since yesterday", "last hour") into ISO 8601 timestamps.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/read-failures.mjs" --project "<root>" --limit 20 [--session <id>] [--since <iso>] [--until <iso>]
```

The script prints one JSON object per line, newest first: `timestamp`, `sessionId`, `kind`, `tool`, `input`, `error`.

If it prints nothing, reply with exactly:

> Nothing to reveal — the transcripts are quiet.

Then stop.

### 3. Render a compact table
Columns: `time` | `session` | `kind` | `tool` | `summary`

- `time`: `YYYY-MM-DD HH:MM` in local time
- `session`: first 8 characters of `sessionId`
- `kind`: `tool-error`, `user-rejected`, `automode-blocked`, `api-error`, or whatever other kind the script reports
- `tool`: `tool`, or `—`
- `summary`: the first meaningful line of `error`, at most 80 characters; for a Bash failure, prefix the command from `input`

### 4. Footer
One line: `N failures shown. Transcripts older than cleanupPeriodDays (default 30) are gone.`
