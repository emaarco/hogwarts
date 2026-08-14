---
name: protego-init
description: "Adopt the 'always global' native-sandbox best practice — seal every Claude Code session by default (network default-deny, filesystem confined to the worktree) by writing a strict sandbox baseline into ~/.claude/settings.json. Use when the user wants to sandbox/isolate Claude Code, prevent data egress/exfiltration, or set up worktree isolation."
argument-hint: ""
allowed-tools: Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/protego-init.sh"), Read
---

# Skill: protego-init

protego-totalum encodes one opinion: **if you sandbox, do it globally.** Rather
than sealing repos one at a time, it turns on Claude Code's **native OS sandbox**
at the user level — so every repo you open is isolated by default (network
default-deny, writes confined to the worktree), enforced by the OS.

This is a **one-time setup**, not a runtime plugin: it configures Claude Code's own
sandbox and then gets out of the way. There is no per-session hook.

## Steps

### 1. Explain what will change

Tell the user, briefly:
- It merges a strict sandbox baseline into `~/.claude/settings.json` (deep-merged,
  never clobbering existing keys).
- It takes effect on the **next** Claude Code session, not the current one.
- Afterwards, network is **default-deny** everywhere. A project that needs a host
  (e.g. `registry.npmjs.org`) widens *its own* `./.claude/settings.json`.

### 2. Apply it

Run: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/protego-init.sh"`

### 3. Confirm and hand off

Relay the script output. Remind the user the sandbox is active from the next
session. If they later hit a blocked network call in a specific repo, offer to add
that one host to `./.claude/settings.json → sandbox.network.allowedDomains` (you can
make that edit directly — it is a normal settings change).

## Requirements

The native sandbox needs Claude Code's sandbox support: macOS (Seatbelt), or
Linux/WSL2 with `bubblewrap` + `socat`. `failIfUnavailable` is set, so if the
sandbox cannot start, Claude Code refuses to run unsandboxed rather than leaking.
