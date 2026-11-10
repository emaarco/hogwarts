# 🔍 Revelio

> *Revelio* — the revealing charm. Surfaces what your agent tried, and failed.

**See what your agent failed at in a repo, and what to change so it stops.**

A Claude Code plugin that reveals failed tool calls, rejections, auto-mode denials and API errors in your repo so you can act on them: sharpen a skill, add a hook, adjust a permission. It is in early development, so expect the shape to move.

## 🪄 The spell

Claude sometimes fails quietly. A Bash exits non-zero, auto mode refuses a write, the API rate-limits mid-turn. By the time you read the summary, the evidence has scrolled away — but Claude Code still has it in its session transcripts, `~/.claude/projects/<project>/<session>.jsonl`. **Revelio** reads them for you. No hooks, no extra log file.

## 🔍 What it reveals

| Kind | Transcript entry |
|---|---|
| `tool-error` | `tool_result` with `"is_error": true` |
| `user-rejected` | a tool call you declined (`toolDenialKind: "user-rejected"`) |
| `automode-blocked` | a tool call the auto-mode classifier denied |
| `api-error` | entry with `"isApiErrorMessage": true` |

Other denial kinds Claude Code records (`cancelled`, `interrupted`, `permission-rule`) show up as-is.

## ⚡ Install

Inside Claude Code:

```text
/plugin marketplace add emaarco/hogwarts
/plugin install revelio@emaarco
```

## 📜 Usage

```text
/revelio              # the last 20 failures in this repo (or "last 50", "since yesterday", "in session abc123")
/revelio-patterns     # recurring failures across sessions, each with a suggested fix
```

Both are user-invoked only. They share `scripts/read-failures.mjs`, which you can also run yourself:

```bash
node scripts/read-failures.mjs --project "$(git rev-parse --show-toplevel)" --limit 20
```

## 🧰 Act on what you reveal

- A tool keeps failing the same way → write or refine a skill that does it right.
- A permission keeps getting denied → widen the permission or rework the approach.
- An API error recurs → fix the login, back off, or add a `PreToolUse` guard.

## ⚠️ Limits

- Claude Code deletes transcripts after `cleanupPeriodDays` (default 30 days). There is no long-term history.
- The transcript format is not a documented API. The reader skips what it does not understand, but a Claude Code update can change what it finds.
- Transcripts are stored per project root, so sessions started in a subfolder or another worktree of the repo don't show up.
- Transcripts are per user and per machine. For a shared view across a team, use Claude Code's OpenTelemetry export.

## 🔁 Upgrading from 0.2

Revelio no longer writes its own log. See [Migrating from 0.2](docs/migrating-from-0.2.md) for what to clean up.

## 🎭 Companion

See [Protego Totalum](../../tools/protego-totalum/) for the other side of the coin. *Protego guards; Revelio reveals.*

## 🦉 Help and feedback

- **Bugs and ideas:** [open a bug report](https://github.com/emaarco/hogwarts/issues/new?template=bug.yml) or [a feature request](https://github.com/emaarco/hogwarts/issues/new?template=feature.yml).
- **Contributing:** contributions are welcome; how to work on the plugin is in [CONTRIBUTING.md](../../CONTRIBUTING.md) and [CLAUDE.md](CLAUDE.md).

## 📜 License

[MIT](../../LICENSE)
