# Agent Instructions

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

protego-totalum is a **one-command initializer** for a single best practice:
**"if you sandbox Claude Code, do it globally."** `/protego-init` writes a strict
**native OS sandbox** baseline into `~/.claude/settings.json` — a default-deny network
allowlist seeded with just the GitHub ecosystem — so every session is isolated by default.

It is deliberately **not** a runtime plugin: there is no PreToolUse hook, no
per-session config, no interception of tool calls. Isolation is enforced by Claude
Code's OS-level sandbox (macOS Seatbelt / Linux bubblewrap). The plugin's only job
is to turn that on, well, and get out of the way.

Blocking access to *specific* sensitive files/commands (`.env`, SSH keys,
credentials) is a **separate** concern owned by the sibling plugin
**agento-patronum** — do not add that here. Likewise, do not re-introduce a runtime
enforcement hook here; that heaviness is exactly what this plugin was cut down from.

Install via Claude Code marketplace:
```bash
/plugin marketplace add emaarco/hogwarts
/plugin install protego-totalum@emaarco
/protego-init
```

## Architecture

### Plugin Structure
- `.claude-plugin/plugin.json` — marketplace manifest
- `scripts/protego-init.sh` — the only script: deep-merges the sandbox baseline into `~/.claude/settings.json`
- `defaults/settings.json` — the strict global sandbox baseline
- `skills/protego-init/SKILL.md` — the `/protego-init` skill

There is intentionally **no** `hooks/` directory.

### How It Works
1. The user runs `/protego-init` (or `bash scripts/protego-init.sh`)
2. The script deep-merges `defaults/settings.json` into `~/.claude/settings.json`
   with `jq -s '.[0] * .[1]'` — never clobbering existing keys
3. Claude Code's native sandbox applies on the **next** session
4. Projects that need the network widen their own `./.claude/settings.json`
   `sandbox.network.allowedDomains`

### Key Files
- `~/.claude/settings.json` — where the global native sandbox is enabled (user's file, not shipped)

## Common Commands

### Validate
```bash
# Syntax + JSON
bash -n scripts/protego-init.sh
jq empty .claude-plugin/plugin.json defaults/settings.json

# Self-test in a throwaway HOME (does not touch your real settings)
HOME="$(mktemp -d)" CLAUDE_PLUGIN_ROOT="$(pwd)" bash scripts/protego-init.sh
```

## Dependencies

- **bash** and **jq** (REQUIRED). The init script fails fast if jq is missing.

## Best Practices

- Keep this plugin thin. Its value is the *opinion* (global) and the *ergonomics*
  (one command), not features. Resist adding tiers, hooks, or config files.
- The baseline is strict on purpose (GitHub-only `allowedDomains`, `failIfUnavailable`).
  Anything beyond the GitHub ecosystem belongs in the *consuming* repo's settings,
  not in this default.

## Personality

You are a knowledgeable colleague, not someone who passively takes orders. Challenge scope creep — especially any move to turn this back into a runtime plugin.
