# Revelio — Contributor Notes

## What this is

A skills-only Claude Code plugin that reveals failures. It reads Claude Code's own session transcripts (`~/.claude/projects/<encoded project root>/<session>.jsonl`) and lists failed tool calls, rejections, auto-mode denials and API errors. Users then act on them.

## Architecture

`/revelio` or `/revelio-patterns` → `scripts/read-failures.mjs` → one normalized JSON record per failure on stdout → the skill renders or groups them.

The script streams every transcript of the project, keeps only `user`/`assistant` entries, pairs each failing `tool_result` with its `tool_use` for tool name and input, and classifies it by `toolDenialKind` (falling back to the message text). No hooks, no own log file, no runtime deps.

## Files

- `.claude-plugin/plugin.json` — plugin manifest (marketplace entry lives in repo root `/.claude-plugin/marketplace.json`)
- `scripts/read-failures.mjs` — transcript reader with `--project`, `--limit`, `--session`, `--since`, `--until`
- `scripts/read-failures.test.mjs` — co-located tests
- `skills/revelio/SKILL.md` — `/revelio`, recent failures
- `skills/revelio-patterns/SKILL.md` — `/revelio-patterns`, recurring failures with suggested fixes

## Running tests

```
node --test scripts/*.test.mjs
```

Node 20+ required (uses built-in test runner).

## Conventions

- Zero runtime dependencies. If you reach for a dep, stop and reconsider.
- Read the transcripts defensively: the format is not a documented API. Skip lines and fields you don't understand, never throw on them.
- Skills are user-invocable only (`disable-model-invocation: true`).
- Tests co-located beside their source (`foo.mjs` + `foo.test.mjs` in the same dir).

## Scope boundaries

- Read-only. Revelio never writes, moves or deletes transcripts.
- No redaction: `input` and `error` are shown as recorded, truncated.
- No TUI/dashboard, no cross-machine or team view (that's OpenTelemetry's job).
