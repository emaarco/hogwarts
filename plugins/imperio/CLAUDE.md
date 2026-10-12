# Imperio — Contributor Notes

## What this is

A Claude Code plugin that delivers path-scoped rules through a hook instead of relying on Claude to load a skill. Plugins cannot ship `.claude/rules/`, and a skill with `paths:` is only loaded when Claude decides to load it. The hook removes that decision.

## Architecture

`stdin (PreToolUse payload) → rules whose paths match the file → minus rules already delivered → remember → remind`

- `Read` → the rule text is returned as `additionalContext`.
- `Edit`, `Write`, `MultiEdit` → the call is denied once with the rule text as the reason. `additionalContext` on `PreToolUse` reaches Claude only after the tool ran, which is too late for a write.

Delivered rules are remembered per session and agent in `$TMPDIR/imperio/<session_id>.json`. `SessionStart` with source `clear` or `compact` deletes that file, because the rules are gone from the context then.

## Files

- `.claude-plugin/plugin.json` — plugin manifest (marketplace entry lives in repo root `/.claude-plugin/marketplace.json`)
- `rules/<name>.md` — one rule per file; frontmatter holds only `paths:`, the body is delivered verbatim
- `hooks/hooks.json` — registers `PreToolUse` and `SessionStart`
- `hooks/remind-rules.js` — `PreToolUse` entrypoint
- `hooks/forget-reminders.js` — `SessionStart` entrypoint
- `hooks/lib/load-rules.js` — reads `rules/*.md` into name, paths, and body
- `hooks/lib/matches-glob.js` — glob matching (`**`, `*`, `?`, `{a,b}`)
- `hooks/lib/reminder-memory.js` — which rules were delivered to which agent
- `hooks/lib/read-stdin.js` — parse stdin JSON (null on error)
- `hooks/**/*.test.mjs` — co-located tests

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

`paths:` must be a YAML list. Globs are matched against the file path relative to `$CLAUDE_PROJECT_DIR`. Keep rules short, since the whole body lands in the context.

## Running tests

```
node --test "hooks/**/*.test.mjs"
```

Node 20+ required (uses built-in test runner).

## Conventions

- Zero runtime dependencies.
- Hooks must never fail a tool call by accident: on any error they exit 0 without output.
- A rule is remembered before it is delivered, so a failing write to the memory file can never cause a deny loop.
- One responsibility per file. Tests co-located beside their source.

## Scope boundaries

- No checking of the written code. The hook delivers rules, it does not lint.
- No user- or project-defined rules. Those belong in the project's `.claude/rules/`.
- No skills. Rules must not depend on Claude choosing to load them.
