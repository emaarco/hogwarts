# Revelio

> *Revelio* — the revealing charm. Surfaces what your agent tried, and failed.

Claude Code plugin that reveals failed tool calls, rejections, auto-mode denials and API errors in your repo so you can see patterns and act on them — sharpen a skill, add a hook, adjust a permission.

> Early development. Expect the shape to move.

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

```
/plugin marketplace add emaarco/hogwarts
/plugin install revelio@emaarco
```

## 📜 Usage

```
/revelio              # the last 20 failures in this repo (or "last 50", "since yesterday", "in session abc123")
/revelio-patterns     # recurring failures across sessions, each with a suggested fix
```

Both are user-invoked only. They share `scripts/read-failures.mjs`, which you can also run yourself:

```
node scripts/read-failures.mjs --project "$(git rev-parse --show-toplevel)" --limit 20
```

## 🧰 Act on what you reveal

- A tool keeps failing the same way → write or refine a skill that does it right.
- A permission keeps getting denied → widen the permission or rework the approach.
- An API error recurs → fix the login, back off, or add a `PreToolUse` guard.

## ⚠️ Limits

- Claude Code deletes transcripts after `cleanupPeriodDays` (default 30 days). There is no long-term history.
- The transcript format is not a documented API. The reader skips what it does not understand, but a Claude Code update can change what it finds.
- Transcripts are per user and per machine. For a shared view across a team, use Claude Code's OpenTelemetry export.

## 🔁 Migrating from 0.2

Revelio used to write its own log through hooks. That log is gone:

- The hooks and `/revelio-clear` are removed. Nothing writes `.claude/logs/revelio.jsonl` any more.
- Delete old `.claude/logs/revelio.jsonl` files (and `$HOME/.claude/logs/revelio.jsonl`). The `.claude/logs/` line Revelio added to `.gitignore` can go too, unless something else writes there.

## 🎭 Companion

See [`agento-patronum`](../agento-patronum/) for the other side of the coin. *Patronum guards; Revelio reveals.*

## 🤝 Contributing

Revelio welcomes contributions — bug reports, feature ideas, refactors, and docs improvements.

- **Report a bug**: [Open a bug report](https://github.com/emaarco/hogwarts/issues/new?template=bug.yml)
- **Request a feature**: [Open a feature request](https://github.com/emaarco/hogwarts/issues/new?template=feature.yml)
- **Propose a refactor**: [Open a refactor issue](https://github.com/emaarco/hogwarts/issues/new?template=refactor.yml)
- **Improve a skill**: Skills live in `skills/*/SKILL.md` — plain Markdown, easy to edit
- **Improve the transcript reader**: `scripts/read-failures.mjs` with a co-located test — run `node --test scripts/*.test.mjs`

Licensed under [MIT](LICENSE).

---

*Created with ♥ by [Marco Schaeck](https://www.linkedin.com/in/schaeckm) · [LinkedIn](https://www.linkedin.com/in/schaeckm) · [Medium](https://medium.com/@emaarco)*
