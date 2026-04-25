# Agent Instructions — hogwarts monorepo

This repository is a Claude Code **marketplace** that hosts multiple plugins.

## Structure

- `.claude-plugin/marketplace.json` — registers every plugin in `plugins/`
- `plugins/<name>/` — one self-contained plugin per folder, each with its own `.claude-plugin/plugin.json`, `hooks/`, `skills/`, and `CLAUDE.md`
- `.github/workflows/validate-plugins.yml` — single CI pipeline that validates the marketplace and each plugin

When working on a specific plugin, read that plugin's `CLAUDE.md` for plugin-level context (architecture, conventions, scope boundaries).

## Adding a new plugin

1. Create `plugins/<new-plugin>/` with at minimum `.claude-plugin/plugin.json`
2. Add an entry to `.claude-plugin/marketplace.json`:
   ```json
   {
     "name": "<new-plugin>",
     "source": "./plugins/<new-plugin>",
     "description": "..."
   }
   ```
3. Extend `.github/workflows/validate-plugins.yml` with a job for the new plugin

## Conventions

- Plugin names are lowercase-kebab.
- Each plugin owns its dependencies (e.g. `package.json`) inside its folder. No monorepo-level package manager.
- Hook commands inside each plugin should reference `${CLAUDE_PLUGIN_ROOT}` so they remain relocatable.
- Per-plugin docs live under `plugins/<name>/docs/` as plain markdown — no static-site builder.
