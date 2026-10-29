---
name: revelio-patterns
description: "Group recurring failures across this repo's Claude Code sessions and suggest a fix for each pattern."
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git rev-parse:*), Read
---

# /revelio-patterns

Find the failures that keep coming back in this repo and say what would stop them.

## Steps

### 1. Read all failures
Resolve the project root with `git rev-parse --show-toplevel`, otherwise the current working directory. Pass a time range from the user's prompt as ISO 8601 timestamps.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/read-failures.mjs" --project "<root>" [--since <iso>] [--until <iso>]
```

Each line is one failure: `timestamp`, `sessionId`, `kind`, `tool`, `input`, `error`.

If it prints nothing, reply with exactly:

> Nothing to reveal — the transcripts are quiet.

Then stop.

### 2. Group into patterns
A pattern is the same failure in at least two sessions. Group by `kind` + `tool` + what failed, normalised so incidental details don't split a group:

- Bash: the command's program and subcommand (`pnpm test`, `docker build`), plus the error's first line with paths, ids and numbers stripped
- File tools: the path or glob that failed, plus the error's first line
- `user-rejected` / `automode-blocked`: the tool and the command or path that was denied
- `api-error`: the error code (`rate_limit`, `authentication_failed`, …)

Drop single-session failures from the report.

### 3. Suggest a fix per pattern
Pick the lever that would stop it, and name the concrete change:

- **Sharpen a skill or CLAUDE.md** — the agent keeps using a wrong command, flag, or path. Say what to write and where.
- **Add a hook** — a check that should run before the tool call (`PreToolUse`) or block it outright.
- **Adjust a permission** — the same safe action is rejected or auto-mode-blocked again and again: allow it in `.claude/settings.json`. If the denial is right, say the agent needs to learn to stop trying.
- **Fix the environment** — a missing tool, a dead service, an expired login.

Read the repo's `CLAUDE.md` or the relevant skill before suggesting a change to it.

### 4. Report
Sort by number of sessions, most first. For each pattern:

```
### <short name> — <N> failures in <S> sessions, last <YYYY-MM-DD>
kind/tool: <kind> / <tool>
example: <one representative error, max 120 chars>
fix: <lever> — <the concrete change>
```

End with one line: `Transcripts older than cleanupPeriodDays (default 30) are gone, so patterns only cover that window.`
