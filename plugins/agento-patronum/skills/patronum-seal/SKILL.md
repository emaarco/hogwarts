---
name: patronum-seal
argument-hint: "[user|project|managed]"
description: "Seal the environment so nothing leaves the worktree — enable Claude Code's native OS sandbox (filesystem confined to the worktree + network default-deny). Use when the user wants isolation, to prevent data egress/exfiltration, or to sandbox a repo."
allowed-tools: Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-seal.sh" *), Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-status.sh"), AskUserQuestion
---

# Skill: patronum-seal

Apply Claude Code's **native OS sandbox** so a session cannot write outside the
current worktree or reach the network unless explicitly allowed. This is the
primary isolation layer; the always-on `patronum-seal-hook` is the fallback.

## Tiers

- **user** — merges the sealed-by-default baseline into `~/.claude/settings.json`.
  Every repo you open is sealed automatically. Recommended default.
- **project** — merges a baseline into `./.claude/settings.json` with a narrow
  network allowlist for this repo (widen later with `/patronum-allow`).
- **managed** — stages a hard-lock `managed-settings.json` template that a user
  cannot override, and prints the `sudo` command to install it system-wide.

## Steps

### 1. Choose the tier

If the user named a tier in `$ARGUMENTS`, use it. Otherwise use `AskUserQuestion`
to pick between **user** (seal everything by default), **project** (seal just this
repo), and **managed** (hard organisational lock).

### 2. Apply it

Run: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-seal.sh" <tier>`

For the **managed** tier, do NOT run anything with sudo yourself — relay the
staged path and the exact `sudo` commands the script prints so the user runs them.

### 3. Confirm

Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-status.sh"` and report the
resulting layers. Remind the user that native-sandbox changes take effect on the
**next** Claude Code session, and that they can widen the seal with `/patronum-allow`.
