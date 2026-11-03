# Imperio — Contributor Notes

## What this is

Not a Claude Code plugin and not registered in the marketplace. An npm package with one CLI, `imperio`, that syncs `rules/*.md` into the user-level `~/.claude/rules/` (or `$CLAUDE_CONFIG_DIR/rules/`).

## Architecture

`bin/imperio.mjs → RulesSync (lib/rules-sync.mjs) over two RulesFolder (lib/rules-folder.mjs) → report of added / updated / unchanged / removed / skipped`

- Ownership lives in the installed file: frontmatter line `cursed-by: imperio`, added by `RulesSync` on install. Claude Code ignores frontmatter fields other than `paths`.
- Identity is the file name. Only top-level `.md` files of the target folder are looked at.
- A managed file that is no longer in `rules/` is deleted. An unmanaged file is never written or deleted.

## Files

- `rules/<name>.md` — one rule per file; frontmatter holds only `paths:`, never the marker
- `lib/rules-sync.mjs` — `RulesSync`, decides per file what to add, update, remove or skip
- `lib/rules-folder.mjs` — `RulesFolder`, reads and writes the top-level `.md` files of one folder
- `bin/imperio.mjs` — CLI entrypoint, resolves the target folder and prints the report
- `**/*.test.mjs` — co-located tests

## Adding a rule

Create `rules/<name>.md` and list it in `README.md`:

```
---
paths:
  - "**/*.kt"
---

# Rule title

- The rule.
```

User-level `paths` globs are matched relative to the session's working directory. Keep rules short, since the whole body lands in the context.

## Running tests

```
npm test
```

## Conventions

- Zero runtime dependencies.
- Renaming a rule file counts as removing the old one and adding a new one; that is fine.

## Scope boundaries

- No project-level `.claude/rules/`, no hooks, no linting.
