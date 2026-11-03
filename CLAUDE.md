# Agent Instructions — hogwarts monorepo

This repository is a Claude Code **marketplace** that hosts multiple plugins, plus a few standalone tools that are not plugins.

## Structure

- `.claude-plugin/marketplace.json` — registers every plugin in `plugins/`
- `plugins/<name>/` — one self-contained plugin per folder, each with its own `.claude-plugin/plugin.json`, `hooks/`, `skills/`, and `CLAUDE.md`
- `tools/<name>/` — one self-contained npm package per folder with a CLI that syncs config into `~/.claude`; not registered in the marketplace
- `.github/workflows/validate-plugins.yml` — single CI pipeline that validates the marketplace, each plugin and each tool

When working on a specific plugin or tool, read its `CLAUDE.md` for context (architecture, conventions, scope boundaries).

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

## Adding a new tool

1. Create `tools/<new-tool>/` with a `package.json` (`bin`, `files`, `scripts.test`) and a `CLAUDE.md`
2. Extend `.github/workflows/validate-plugins.yml` with a job that runs `npm test` in it
3. List it under "Tools" in the root `README.md`

## Conventions

- Plugin and tool names are lowercase-kebab.
- Each plugin and tool owns its dependencies (e.g. `package.json`) inside its folder. No monorepo-level package manager.
- Hook commands inside each plugin should reference `${CLAUDE_PLUGIN_ROOT}` so they remain relocatable.
- Per-plugin docs live under `plugins/<name>/docs/` as plain markdown — no static-site builder.
