---
name: conductor-setup
description: "Sets up a repo for Conductor end-to-end: install/setup script, selectable Run targets (disables single autostart), and archive cleanup — writes .conductor/settings.toml or settings.local.toml. Use when asked to set up conductor, configure a workspace, add run targets, stop conductor autostarting, make a run-button menu, or add archive/cleanup on workspace removal."
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, AskUserQuestion
---

# Skill: conductor-setup

Configures a repo's full Conductor workspace lifecycle in `.conductor/settings.toml`: **setup** (runs after workspace creation), **run** (a menu of selectable, named targets instead of one auto-starting script), and **archive** (cleanup before a workspace is removed). See the [Conductor scripts reference](https://conductor.build/docs/reference/scripts).

Work collaboratively: discover real commands, confirm choices, then write. **Never overwrite an existing script without asking. Do not commit, push, or open a PR.**

## Checklist

1. **Pick the config file.** Two locations, different reach:
   - `.conductor/settings.toml` — shared/committed. **Only takes effect in workspaces created AFTER it merges to the default branch** (see the warning below).
   - `.conductor/settings.local.toml` — personal, gitignored, **applies immediately on this machine**. Same schema; keys override the shared file.
   Ask which the user wants; recommend the shared file for team-wide setup, the local file for a personal/immediate test.

2. **Discover repo conventions — never invent commands.** Read `package.json` `scripts`, `Makefile`/`justfile`/`Taskfile`, README, Procfile, compose files, `.env*.example`, and any existing `.conductor/settings.toml` / `settings.local.toml` / legacy `conductor.json`:
   ```bash
   jq '.scripts' package.json 2>/dev/null
   grep -E '^[a-zA-Z_-]+:' Makefile justfile Taskfile* 2>/dev/null
   cat .conductor/settings.toml .conductor/settings.local.toml 2>/dev/null
   ```

3. **Confirm scope (AskUserQuestion):** which of **setup / run / archive** to configure now — not every repo needs all three. Then work through the chosen sections below.

### Setup

Runs once after workspace creation, from the workspace directory. Use it for installs, `.env` copies from `$CONDUCTOR_ROOT_PATH`, symlinks, submodules. Confirm the command, then write `scripts.setup`.

### Run (option-based)

Turns a single auto-starting script into a **menu of named targets** (dev / test / worker / …), each with its own command and icon, with autostart off so a workspace opens quietly and the user picks what to run.

- Confirm with the user which targets to expose, which one is the **default** (exactly one), and whether autostart is off (**recommend off**). Map each chosen target to a discovered command — don't guess.
- Write each as `[scripts.run.<id>]` with `command`, `icon`, and exactly one `default = true`. **Remove** any legacy single `run = "..."` and `auto_run_after_setup`.
- **Icons**: `icon` is a [Lucide](https://lucide.dev/icons) name, kebab-case. Safe picks: `play`, `code`, `flame`, `book-open`, `globe`, `server`, `terminal`, `rocket`, `database`, `test-tube`. An invalid name silently falls back to `play`.
- **`run_mode`**: `concurrent` **only** when targets isolate per workspace (bind `$CONDUCTOR_PORT`, or worktree-aware `.localhost` URLs); otherwise `nonconcurrent` (shared fixed port / single DB / one Docker stack).

### Archive

Runs before a workspace is cleaned up. Use it to tear down anything the workspace created outside the git worktree itself — Docker containers/volumes, cloud sandboxes, reserved ports/DNS entries, temp branches. Scope cleanup with `$CONDUCTOR_WORKSPACE_NAME`. Confirm what external resources this repo's setup/run scripts actually create before writing one — don't add cleanup for resources that don't exist. Write as `scripts.archive` (inline command or a path to a script file).

## Before → after

Legacy single auto-running script, no cleanup:
```toml
"$schema" = "https://conductor.build/schemas/settings.repo.schema.json"

[scripts]
setup = "npm install"
run = "npm run dev"
auto_run_after_setup = true
```

Full lifecycle — install, selectable targets, cleanup:
```toml
"$schema" = "https://conductor.build/schemas/settings.repo.schema.json"

[scripts]
setup = "npm install"
run_mode = "concurrent"
archive = "./scripts/workspace-archive.sh"

[scripts.run.dev]
command = "npm run dev -- --port $CONDUCTOR_PORT"
default = true
icon = "play"

[scripts.run.test]
command = "npm run test:watch"
icon = "test-tube"

[scripts.run.storybook]
command = "npm run storybook"
icon = "book-open"
```
Removing `run` + `auto_run_after_setup` and defining named targets is what disables autostart — a workspace now opens with the menu and waits for the user to press Run.

## ⚠️ Merge caveat

`.conductor/settings.toml` is read from the **default branch**, so edits only reach workspaces created *after* they merge — your current workspace will **not** see them until then. To try the setup immediately on this machine, put it in `.conductor/settings.local.toml` (gitignored) instead, or move it there once merged. Say which file you wrote and what the user must do for it to take effect.

## Verify, then stop

- TOML parses: `python3 -c "import tomllib,sys; tomllib.load(open(sys.argv[1],'rb'))" .conductor/settings.toml` (or `settings.local.toml`).
- If `run` targets were touched: exactly one has `default = true`; no leftover `run =` or `auto_run_after_setup`.
- Report the file written, which sections were configured (setup/run/archive), the run targets and default, `run_mode`, and the merge caveat. Do not commit.
