# 🔍 Revelio

> *Revelio* — the revealing charm. Surfaces what your agent tried, and failed.

**See what your agent failed at in a repo, and what to change so it stops.**

A Claude Code plugin that lists what failed in your repo so you can act on it: sharpen a skill, add a hook, adjust a permission.

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
/revelio-patterns     # failures that recur in 2+ sessions, each with a suggested fix
```

Claude never runs them on its own; you type them.

## 🧰 Act on what you reveal

- A tool keeps failing the same way → write or refine a skill that does it right.
- A permission keeps getting denied → widen the permission or rework the approach.
- An API error recurs → fix the login, the network or the rate limit.

## ⚠️ Limits

- Claude Code deletes transcripts after `cleanupPeriodDays` (default 30 days); raise it in `~/.claude/settings.json` to keep more history.
- The transcript format is not a documented API. The reader skips what it does not understand, but a Claude Code update can change what it finds.
- Transcripts are stored per project root, so sessions started in a subfolder or another worktree of the repo don't show up.
- Transcripts are per user and per machine. For a shared view across a team, use Claude Code's [OpenTelemetry export](https://code.claude.com/docs/en/monitoring-usage).

## 🔁 Upgrading from 0.x

Revelio no longer writes its own log. See [Migrating from 0.2](docs/migrating-from-0.2.md) for what to clean up.

## 🎭 Companion

Calls blocked by [Protego Totalum](../../tools/protego-totalum/)'s hook show up here as `tool-error`. *Protego guards; Revelio reveals.*

## 🦉 Help and feedback

- **Bugs and ideas:** [open a bug report](https://github.com/emaarco/hogwarts/issues/new?template=bug.yml) or [a feature request](https://github.com/emaarco/hogwarts/issues/new?template=feature.yml).
- **Contributing:** contributions are welcome; see [CONTRIBUTING.md](../../CONTRIBUTING.md).

## 📜 License

[MIT](../../LICENSE)
