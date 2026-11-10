# 🌀 Imperio

> *Imperio* — the Imperius Curse. Puts your rules into the agent's head. Like Harry, it can still fight back.

**Give Claude Code a code style in every project, loaded only when it touches matching files.**

Not a plugin: a small script that keeps the code style rules below, written by the author of this repo, up to date in your user-level `~/.claude/rules/`.

## 🪄 The spell

Plugins cannot ship `.claude/rules/`, and a skill with `paths:` only helps when Claude decides to load it. Rules in `~/.claude/rules/` need no such decision: Claude Code loads a rule with `paths:` as soon as it reads or edits a matching file, in every project on your machine.

Each run of `imperio` fully syncs that folder:

| File in `~/.claude/rules/` | What happens |
|---|---|
| Shipped by imperio, not there yet | Added. |
| Managed by imperio, still shipped | Overwritten with the shipped version. |
| Managed by imperio, no longer shipped | Deleted. |
| Your own rule | Never touched, even if its name collides with a shipped rule (reported as `skipped`). |

A file counts as managed when its frontmatter contains `cursed-by: imperio`. Imperio adds that line on install. Claude Code only reads `paths` from a rule's frontmatter, ignores every other field and strips the frontmatter before loading, so the marker costs no context. Edits to a managed file are lost on the next run; to customise a rule, edit it in place and delete the `cursed-by: imperio` line; imperio then leaves it alone. To opt out of a rule, keep an empty file with its name. To uninstall, delete the files whose frontmatter has the marker.

## 📜 Rules

- **[kotlin-style](./rules/kotlin-style.md)** (`**/*.kt`): One element per line in multi-line collection literals; function bodies instead of expression bodies; named arguments for calls with two or more arguments.
- **[typescript-style](./rules/typescript-style.md)** (`**/*.ts`, `**/*.tsx`): Descriptive variable names, no abbreviations; classes with a clear name and scope instead of files full of loose functions (React components and hooks excepted).
- **[package-json-style](./rules/package-json-style.md)** (`**/package.json`): Exact dependency versions, no `^`, `~`, or other ranges.

## ⚡ Run

```bash
git clone https://github.com/emaarco/hogwarts.git
cd hogwarts
npx ./tools/imperio
```

Rerun it after `git pull`. It respects `CLAUDE_CONFIG_DIR`, so you can try it on a throwaway folder first:

```bash
CLAUDE_CONFIG_DIR=/tmp/claude-test npx ./tools/imperio
```

Needs Node 20+.

## 🚫 Non-goals

- **No enforcement.** The curse can be resisted. A rule in context is guidance, not a check. Use a linter for that.
- **No project rules.** Imperio only writes to the user-level folder. Rules that belong to one repo go into that repo's `.claude/rules/`.

## 🦉 Help and feedback

A rule that misfires? [Open an issue](https://github.com/emaarco/hogwarts/issues/new/choose). Contributing: [CONTRIBUTING.md](../../CONTRIBUTING.md).

## 📜 License

[MIT](../../LICENSE)
