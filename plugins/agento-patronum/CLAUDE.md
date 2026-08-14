# Agent Instructions

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

agento-patronum is a Claude Code plugin with two responsibilities:

1. **Static protection** — blocks access to sensitive files, credentials, and commands (via `patronum-hook.sh`, patterns in `~/.claude/patronum.json`).
2. **The seal** — isolates the worktree against data egress and cross-project leakage. Two layers: (a) Claude Code's **native OS sandbox** (`sandbox.*` in settings.json — filesystem confined to the worktree, network default-deny), enabled via `patronum-seal.sh`; and (b) a defense-in-depth **PreToolUse egress/boundary hook** (`patronum-seal-hook.sh`, config `~/.claude/patronum-seal.json`).

The static layer relies on PreToolUse hooks because settings.json deny rules were historically unreliable. The seal's primary layer is the native sandbox (OS-enforced); the hook is the in-session fallback.

Install via Claude Code marketplace:
```bash
/plugin marketplace add emaarco/hogwarts
/plugin install agento-patronum@emaarco
```

## Architecture

### Plugin Structure
- `.claude-plugin/plugin.json` — marketplace manifest
- `hooks/hooks.json` — registers SessionStart + two PreToolUse hooks (static + seal)
- `scripts/patronum-*.sh` — all shell scripts. Static: hook, setup, add, remove, list, verify, uninstall. Seal: `patronum-seal.sh`, `patronum-seal-hook.sh`, `patronum-status.sh`, `patronum-allow.sh`, `patronum-seal-verify.sh`
- `defaults/patronum.json` — default static protection patterns
- `defaults/patronum-seal.json` — default egress rules + boundary allowPaths for the seal hook
- `defaults/settings/{user,project,managed}-settings.json` — native-sandbox templates applied by `patronum-seal.sh`
- `skills/*/SKILL.md` — user-facing skills (per agentskills.io spec)
- `.claude/skills/*/SKILL.md` — dev-only skills (installed with plugin, prefixed `patronum-dev-`)
- `dev/skills/*/SKILL.md` — dev-only skills (NOT installed with plugin)
- `docs/` — Markdown documentation (read in-tree; no static site builder)

### How It Works
1. On install, `hooks.json` registers a SessionStart hook and a PreToolUse hook
2. SessionStart runs `patronum-setup.sh` which copies default patterns to `~/.claude/patronum.json`
3. Every Read/Write/Edit/Bash call goes through `patronum-hook.sh`
4. The hook checks the file path or command against patterns in `~/.claude/patronum.json`
5. If a pattern matches, the hook exits with code 2 (blocks the tool) and logs to `~/.claude/patronum.log`

### Key Files
- `~/.claude/patronum.json` — static protection config (persists across plugin updates)
- `~/.claude/patronum.log` — JSONL audit log of blocked static-protection actions
- `~/.claude/patronum-seal.json` — seal hook config: egress commands, `allowPaths`, `blockWebFetch`/`blockWebSearch`, `boundaryEnforcement`, `enabled`
- `~/.claude/patronum-seal.log` — JSONL audit log of blocked egress/boundary actions
- `~/.claude/settings.json` (+ project/managed settings) — where the native sandbox is enabled

### Seal specifics
- Boundary check is **lexical** (`normalize_path` resolves `..`/`.` without touching disk) so it works for not-yet-created Write targets. Paths outside `cwd` (from the hook's `.cwd`) and outside `allowPaths` are blocked.
- `git push` is allowed only to `origin`; any other remote/URL is treated as egress.
- `patronum-seal.sh` deep-merges templates into settings with `jq -s '.[0] * .[1]'` — never clobbers existing keys. Managed tier is staged locally; the user runs the printed `sudo` copy.

## Common Commands

### Validate
```bash
# Check all scripts compile
bash -n scripts/patronum-*.sh

# Validate all JSON
jq empty .claude-plugin/plugin.json hooks/hooks.json defaults/patronum.json defaults/patronum-seal.json
for f in defaults/settings/*.json; do jq empty "$f"; done

# Run self-tests (static + seal)
CLAUDE_PLUGIN_ROOT="$(pwd)" bash scripts/patronum-verify.sh
CLAUDE_PLUGIN_ROOT="$(pwd)" bash scripts/patronum-seal-verify.sh
```

## Dependencies

- **bash** — all scripts
- **jq** — JSON parsing and manipulation (REQUIRED, no python3 dependency)
  - Install: `brew install jq` (macOS) or `apt install jq` (Linux)
  - Check: `jq --version`
  - Setup scripts fail fast if jq is missing

## Best Practices

### Verify After Each Change
After modifying any script, run `bash -n` and `patronum-verify.sh` to confirm syntax and behavior.

### Script Naming
All scripts are prefixed with `patronum-` to avoid name collisions with other plugins.

### Hook Exit Codes
- `exit 0` — allow the tool call
- `exit 2` — block the tool call (stderr message shown to Claude)

## Personality

You are a knowledgeable colleague, not someone who passively takes orders. Challenge ideas that could benefit from improvement. Push back on patterns that might cause false positives or miss real threats.
