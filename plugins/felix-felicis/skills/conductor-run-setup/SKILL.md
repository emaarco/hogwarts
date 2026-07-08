---
name: conductor-run-setup
description: "Sets up selectable Conductor run targets in .conductor/settings.toml and disables autostart — replaces a single auto-running run script with a set of named, icon-labelled Run-button targets. Use when asked to set up conductor run options, add run targets, stop conductor autostarting, or make a run-button menu."
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, AskUserQuestion
---

# Skill: conductor-run-setup

Turns a repo's Conductor Run button from a single auto-starting script into a **menu of named, selectable targets** (dev / test / worker / …), each with its own command and icon, and turns **autostart off** so a workspace opens quietly and the user picks what to run. Configured in `.conductor/settings.toml` per the [Conductor scripts reference](https://conductor.build/docs/reference/scripts).

Run this when asked to "set up conductor run options", "add run targets", "stop conductor autostarting", or "make a run-button menu". Work collaboratively: discover real commands, confirm choices, then write. **Never overwrite an existing run config without asking. Do not commit, push, or open a PR.**

## Checklist

1. **Pick the config file.** Two locations, different reach:
   - `.conductor/settings.toml` — shared/committed. **Only takes effect in workspaces created AFTER it merges to the default branch** (see the warning below).
   - `.conductor/settings.local.toml` — personal, gitignored, **applies immediately on this machine**. Same schema; keys override the shared file.
   Ask which the user wants; recommend the shared file for team-wide targets, the local file for a personal/immediate setup.

2. **Discover real run commands — never invent them.** Read `package.json` `scripts`, `Makefile`/`justfile`/`Taskfile`, README, Procfile, compose files, and any existing `.conductor/settings.toml` / legacy `conductor.json`:
   ```bash
   jq '.scripts' package.json 2>/dev/null
   grep -E '^[a-zA-Z_-]+:' Makefile justfile Taskfile* 2>/dev/null
   cat .conductor/settings.toml .conductor/settings.local.toml 2>/dev/null
   ```

3. **Confirm with the user (AskUserQuestion):** which targets to expose, which is the **default** (exactly one), and whether autostart is off (**recommend off**). Map each chosen target to a discovered command — don't guess.

4. **Write the config** using the `[scripts.run.<id>]` table form: each target gets a `command`, an `icon`, and exactly one carries `default = true`. **Remove** any legacy single `run = "..."` and `auto_run_after_setup`. **Keep** existing `setup`, `archive`, and `run_mode`.

5. **Choose `run_mode`.** Prefer `concurrent` **only** when targets isolate per workspace (bind `$CONDUCTOR_PORT`, or worktree-aware `.localhost` URLs); otherwise `nonconcurrent` (shared fixed port / single DB / one Docker stack).

## Icons

`icon` is a [Lucide](https://lucide.dev/icons) name. Safe picks: `play`, `code`, `flame`, `book-open`, `globe`, `server`, `terminal`, `rocket`, `database`, `test-tube`. An invalid name silently falls back to `play`.

## Before → after

Legacy single auto-running script:
```toml
"$schema" = "https://conductor.build/schemas/settings.repo.schema.json"

[scripts]
setup = "npm install"
run = "npm run dev"
auto_run_after_setup = true
```

Selectable targets, autostart off:
```toml
"$schema" = "https://conductor.build/schemas/settings.repo.schema.json"

[scripts]
setup = "npm install"
run_mode = "concurrent"

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
- Exactly one target has `default = true`; no leftover `run =` or `auto_run_after_setup`.
- Report the file written, the targets, the default, `run_mode`, and the merge caveat. Do not commit.
