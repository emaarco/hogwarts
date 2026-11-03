# Protego Totalum — Contributor Notes

## What this is

Not a Claude Code plugin and not registered in the marketplace. An npm package with one CLI, `protego-totalum`, that syncs `hooks/` into `~/.claude/hooks/protego-totalum/` and merges `settings.json` into `~/.claude/settings.json` (or the same paths under `$CLAUDE_CONFIG_DIR`).

## Architecture

`bin/protego-totalum.mjs → SettingsSync (lib/settings-sync.mjs) over two JsonFile (lib/json-file.mjs), then HooksSync (lib/hooks-sync.mjs) → report`

- Settings first, so an invalid `settings.json` stops the run before anything is written.
- `{{hooksDirectory}}` in `settings.json` is replaced with the installed hooks folder before merging.
- Ownership of settings lives in `protego-totalum.lock.json`: the shipped settings of the last run. A value is ours when it still equals the lock. A value of the user is never overwritten or removed.
- Objects merge key by key, lists item by item (deep equality), everything else as one value.
- The installed hooks folder is fully owned and mirrored, including deletes.

## Files

- `settings.json` — the settings fragment that is merged into the user settings
- `hooks/patronum-hook.sh` — PreToolUse hook; reads `patronum.json` next to itself, exit 2 blocks the tool call
- `hooks/patronum.json` — the protected patterns (`pattern`, `reason`)
- `lib/settings-sync.mjs` — `SettingsSync`, merges shipped settings into the user settings
- `lib/hooks-sync.mjs` — `HooksSync`, mirrors one folder into another
- `lib/json-file.mjs` — `JsonFile`, reads and writes one JSON file
- `bin/protego-totalum.mjs` — CLI entrypoint, resolves the paths and prints the report
- `**/*.test.mjs` — tests; hook tests live in `test/` so they are not synced with the hooks

## Adding a pattern

Add `{ "pattern": "...", "reason": "..." }` to `hooks/patronum.json` and a case to `test/patronum-hook.test.mjs`. File patterns are globs (`**/`, `~`), command patterns are `Bash(<command>)` and match the command and the command followed by arguments.

## Running tests

```
npm test
```

Needs `jq` for the hook tests.

## Conventions

- Zero runtime dependencies for the CLI; the hook needs bash and jq.
- Never touch a settings value the lock doesn't prove is ours.

## Scope boundaries

- No project-level `.claude/settings.json`, no skills, no runtime pattern management.
