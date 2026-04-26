# Revelio — Contributor Notes

## What this is

A Claude Code plugin that reveals failures. Every time a tool call fails, the turn ends on an API error, or auto-mode denies a permission, one hook writes a JSONL record to `$CLAUDE_PROJECT_DIR/.claude/logs/revelio.jsonl` (or `$HOME/.claude/logs/revelio.jsonl` as a fallback). Users then read the log and act on it.

## Architecture

`stdin (hook payload) → normalize for this event → append JSONL line → exit 0`

On session start (`UserPromptSubmit`), `ensure-gitignore.js` idempotently adds `.claude/logs/` to the project `.gitignore` so log files are never accidentally committed.

One hook script per event. Shared lib for stdin + log-path + append. No router, no config, no runtime deps.

## Files

- `.claude-plugin/plugin.json` — plugin manifest (marketplace entry lives in repo root `/.claude-plugin/marketplace.json`)
- `hooks/hooks.json` — registers 3 events → 3 scripts
- `hooks/log-tool-failure.js` — `PostToolUseFailure` entrypoint
- `hooks/log-api-failure.js` — `StopFailure` entrypoint
- `hooks/log-permission-denied.js` — `PermissionDenied` entrypoint
- `hooks/lib/read-stdin.js` — parse stdin JSON (null on error)
- `hooks/lib/resolve-log-path.js` — compute log path with homedir fallback
- `hooks/lib/append-record.js` — mkdir + append a JSONL line, never throws
- `hooks/ensure-gitignore.js` — `UserPromptSubmit` entrypoint; idempotently adds `.claude/logs/` to `.gitignore`
- `hooks/*.test.mjs` — co-located tests (every source file has one)
- `hooks/multi-event.test.mjs` — cross-script sanity check
- `skills/revelio/SKILL.md` — `/revelio` slash command
- `skills/revelio-clear/SKILL.md` — `/revelio-clear` slash command

## Running tests

```
node --test "hooks/**/*.test.mjs"
```

Node 20+ required (uses built-in test runner).

## Conventions

- Zero runtime dependencies. If you reach for a dep, stop and reconsider.
- Hooks must never throw and must always `process.exit(0)`. Logging never blocks Claude.
- One responsibility per file. Tests co-located beside their source (`foo.js` + `foo.test.mjs` in the same dir).
- No new config surface unless there's a concrete user need.

## Scope boundaries

- No log rotation, compression, or remote sync.
- No redaction (v0.1 records `tool_input` as-is — see README Non-goals).
- No TUI/dashboard.
- No success-path logging. Noise is the enemy.
