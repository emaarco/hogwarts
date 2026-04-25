# Revelio

> *Revelio* — the revealing charm. Surfaces what your agent tried, and failed.

Claude Code plugin that logs failed tool calls, failed AI interactions, and permission denials into a per-repo JSONL log so you can see patterns and act on them — sharpen a skill, add a hook, tighten a permission.

> Early development. Expect the shape to move.

## 🪄 The spell

Claude sometimes fails quietly. A Bash exits non-zero, a Write hits a path auto-mode refuses, the API rate-limits mid-turn. By the time you read the summary, the evidence is gone. **Revelio** writes each failure to `.claude/logs/revelio.jsonl` in the current repo — one JSON per line, append-only, atomic.

Nothing fancy. Just *revealing*.

## 🔍 What it captures

| Hook event | When it fires | Record includes |
|---|---|---|
| `PostToolUseFailure` | After a tool call fails | `tool_name`, `tool_input`, `error` |
| `StopFailure` | Turn ends on API error (rate limit, auth, billing, etc.) | `stop_reason`, `error` |
| `PermissionDenied` | Auto-mode classifier denies a tool call | `tool_name`, `tool_input`, `reason` |

Every record also carries `timestamp`, `event`, `session_id`, `cwd`.

## ⚡ Install

```
/plugin marketplace add emaarco/hogwarts
/plugin install revelio@emaarco
```

Works identically whether installed globally, per-project, or via marketplace — the log path resolves from `$CLAUDE_PROJECT_DIR` at hook-call time.

If `$CLAUDE_PROJECT_DIR` is unset (rare), records fall back to `$HOME/.claude/logs/revelio.jsonl` so nothing is silently dropped.

## 📜 Usage

```
/revelio          # tail the last 20 entries (or "show me the last 50")
/revelio-clear    # obliviate the log after confirmation
```

Or just:

```
tail -f .claude/logs/revelio.jsonl | jq
```

## 📋 Example record

```json
{
  "timestamp": "2026-04-22T09:41:07.123Z",
  "event": "PostToolUseFailure",
  "session_id": "abc123",
  "cwd": "/Users/you/project",
  "tool_name": "Bash",
  "tool_use_id": "toolu_01ABC",
  "tool_input": { "command": "pnpm test" },
  "error": "Command exited with non-zero status code 1"
}
```

## 🧰 Act on what you reveal

- A tool keeps failing the same way → write or refine a skill that does it right.
- A permission keeps getting denied → widen the permission or rework the approach.
- An API error recurs → add a `PreToolUse` guard or back off differently.

The log is the evidence. You're the auditor.

## 🚫 Non-goals

- No log rotation — clear with `/revelio-clear`.
- No redaction — `tool_input` is captured as-is. If your agent passes secrets through tools, scrub before committing the log. A redaction pass may come in a later version.
- No remote sync, no dashboard, no config file. Revelio stays small on purpose.

## 🎭 Companion

See [`agento-patronum`](../agento-patronum/) for the other side of the coin. *Patronum guards; Revelio reveals.*

## 🤝 Contributing

Revelio welcomes contributions — bug reports, feature ideas, refactors, and docs improvements.

- **Report a bug**: [Open a bug report](https://github.com/emaarco/hogwarts/issues/new?template=bug.yml)
- **Request a feature**: [Open a feature request](https://github.com/emaarco/hogwarts/issues/new?template=feature.yml)
- **Propose a refactor**: [Open a refactor issue](https://github.com/emaarco/hogwarts/issues/new?template=refactor.yml)
- **Improve a skill**: Skills live in `skills/*/SKILL.md` — plain Markdown, easy to edit
- **Improve a hook**: Hook scripts are in `hooks/` with co-located tests — run `node --test "hooks/**/*.test.mjs"`

Licensed under [MIT](LICENSE).

---

*Created with ♥ by [Marco Schaeck](https://www.linkedin.com/in/schaeckm) · [LinkedIn](https://www.linkedin.com/in/schaeckm) · [Medium](https://medium.com/@emaarco)*
