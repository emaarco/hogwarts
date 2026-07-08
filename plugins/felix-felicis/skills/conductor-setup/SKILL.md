---
name: conductor-setup
description: "Sets up a repo for Conductor end-to-end: install/setup script (automatic), selectable Run targets (with more than one, no default so nothing autostarts), and archive cleanup (automatic) — writes .conductor/settings.toml. Use when asked to set up conductor, configure a workspace, add run targets, stop conductor autostarting, make a run-button menu, or add archive/cleanup on workspace removal."
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, AskUserQuestion
---

# Skill: conductor-setup

Configures a repo's full Conductor workspace lifecycle in `.conductor/settings.toml`: **setup** (runs after workspace creation), **run** (a menu of selectable, named targets instead of one auto-starting script), and **archive** (cleanup before a workspace is removed). See the [Conductor scripts reference](https://conductor.build/docs/reference/scripts).

Work collaboratively: discover real commands, confirm choices, then write. **Never overwrite an existing script without asking. Do not commit, push, or open a PR.**

## Checklist

1. **Config file:** write `.conductor/settings.toml` — shared/committed. **Only takes effect in workspaces created AFTER it merges to the default branch** (see the warning below).

2. **Discover repo conventions — never invent commands.** Read `package.json` `scripts`, `Makefile`/`justfile`/`Taskfile`, README, Procfile, compose files, `.env*.example`, and any existing `.conductor/settings.toml` / legacy `conductor.json`:
   ```bash
   jq '.scripts' package.json 2>/dev/null
   grep -E '^[a-zA-Z_-]+:' Makefile justfile Taskfile* 2>/dev/null
   cat .conductor/settings.toml 2>/dev/null
   ```

3. **Configure setup and archive automatically** — don't ask whether to include them. Then work through **run** below.

### Setup (automatic)

Runs once after workspace creation, from the workspace directory. Use it for installs, `.env` copies from `$CONDUCTOR_ROOT_PATH`, symlinks, submodules. Pick the command from discovered conventions and write `scripts.setup` (only confirm if the choice is ambiguous).

### Run (option-based)

Turns a single auto-starting script into a **menu of named targets** (dev / test / worker / …), each with its own command and icon, that the user triggers manually.

- Confirm with the user which targets to expose. Map each to a discovered command — don't guess.
- **Default target:** with **more than one** target, set **no default** (`default` omitted everywhere) so the workspace opens quietly and nothing autostarts — the user presses Run on whichever they want. Only a **single** target may carry `default = true`, and even then off is fine.
- Write each as `[scripts.run.<id>]` with `command` and `icon`. **Remove** any legacy single `run = "..."` and `auto_run_after_setup`.
- **Icons**: `icon` is a [Lucide](https://lucide.dev/icons) name, kebab-case. Safe picks: `play`, `code`, `flame`, `book-open`, `globe`, `server`, `terminal`, `rocket`, `database`, `test-tube`. An invalid name silently falls back to `play`.
- **`run_mode`**: `concurrent` **only** when targets isolate per workspace (bind `$CONDUCTOR_PORT`, or worktree-aware `.localhost` URLs); otherwise `nonconcurrent` (shared fixed port / single DB / one Docker stack).

### Archive / cleanup (automatic)

Runs before a workspace is cleaned up. Tear down anything the workspace created outside the git worktree itself — Docker containers/volumes, cloud sandboxes, reserved ports/DNS entries, temp branches. Scope cleanup with `$CONDUCTOR_WORKSPACE_NAME`. Write `scripts.archive` (inline command or a script path) whenever the setup/run scripts create such external resources; if they create none, skip it — don't invent cleanup for resources that don't exist.

## Before → after

Legacy single auto-running script, no cleanup:
```toml
"$schema" = "https://conductor.build/schemas/settings.repo.schema.json"

[scripts]
setup = "npm install"
run = "npm run dev"
auto_run_after_setup = true
```

Full lifecycle — install, selectable targets (no default → nothing autostarts), cleanup:
```toml
"$schema" = "https://conductor.build/schemas/settings.repo.schema.json"

[scripts]
setup = "npm install"
run_mode = "concurrent"
archive = "./scripts/workspace-archive.sh"

[scripts.run.dev]
command = "npm run dev -- --port $CONDUCTOR_PORT"
icon = "play"

[scripts.run.test]
command = "npm run test:watch"
icon = "test-tube"

[scripts.run.storybook]
command = "npm run storybook"
icon = "book-open"
```
Removing `run` + `auto_run_after_setup`, defining named targets, and leaving **no** `default` is what disables autostart — a workspace now opens with the menu and waits for the user to press Run.

## ⚠️ Merge caveat

`.conductor/settings.toml` is read from the **default branch**, so edits only reach workspaces created *after* they merge — your current workspace will **not** see them until then. Tell the user this: the setup takes effect once merged, on newly created workspaces.

## Verify, then stop

- TOML parses: `python3 -c "import tomllib,sys; tomllib.load(open(sys.argv[1],'rb'))" .conductor/settings.toml`.
- If `run` targets were touched: with more than one target, **no** `default = true` anywhere (at most one, and only when there's a single target); no leftover `run =` or `auto_run_after_setup`.
- Report which sections were configured (setup/run/archive) in `.conductor/settings.toml`, the run targets and whether any is default, `run_mode`, and the merge caveat. Do not commit.
