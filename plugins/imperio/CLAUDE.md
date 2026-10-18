# Imperio — Contributor Notes

## What this is

A Claude Code plugin, currently beta, that injects path-scoped rules through a hook instead of relying on Claude to load a skill. Plugins cannot ship `.claude/rules/`, and a skill with `paths:` is only loaded when Claude decides to load it. The hook removes that decision.

## Architecture

`stdin (PreToolUse payload) → rules whose paths match the file → minus rules already injected → mark as injected → inject`

- `Read` → the rule text is returned as `additionalContext`.
- `Edit`, `Write`, `MultiEdit` → the call is denied once with the rule text as the reason. `additionalContext` on `PreToolUse` reaches Claude only after the tool ran, which is too late for a write.

Which rules were already injected is stored per session and agent in `$TMPDIR/imperio/<session_id>.json`. `SessionStart` with source `clear` or `compact` deletes that file, because the rules are gone from the context then.

## Files

- `.claude-plugin/plugin.json` — plugin manifest (marketplace entry lives in repo root `/.claude-plugin/marketplace.json`)
- `rules/<name>.md` — one rule per file; frontmatter holds only `paths:`, the body is injected verbatim
- `hooks/hooks.json` — registers `PreToolUse` and `SessionStart`
- `hooks/inject-rules.js` — `PreToolUse` entrypoint
- `hooks/reset-injected-rules.js` — `SessionStart` entrypoint; makes the rules get injected again
- `hooks/lib/load-rules.js` — reads `rules/*.md` into name, paths, and body
- `hooks/lib/injected-rules.js` — which rules were already injected for which agent of a session
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

`paths:` must be a YAML list. Globs are matched with Node's `path.matchesGlob` against the file path relative to `$CLAUDE_PROJECT_DIR`. Keep rules short, since the whole body lands in the context.

## Running tests

```
node --test "hooks/**/*.test.mjs"
```

Node 20.17+ or 22.5+ required (`path.matchesGlob`, built-in test runner).

## Conventions

- Zero runtime dependencies.
- Hooks must never fail a tool call by accident: on any error they exit 0 without output.
- A rule is marked as injected before the hook answers, so a failing write to the state file can never cause a deny loop.
- One responsibility per file. Tests co-located beside their source.

## Scope boundaries

- No checking of the written code. The hook injects rules, it does not lint.
- No user- or project-defined rules. Those belong in the project's `.claude/rules/`.
- No skills. Rules must not depend on Claude choosing to load them.
