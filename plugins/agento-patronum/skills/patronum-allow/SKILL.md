---
name: patronum-allow
argument-hint: "--domain <host> | --path <dir>"
description: "Widen the seal for a project that legitimately needs it — allow an outbound domain or an extra write path. Use when a sealed repo needs network access to a specific host or must write outside the worktree."
allowed-tools: Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-allow.sh" *), Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-status.sh"), AskUserQuestion
---

# Skill: patronum-allow

Add a narrow exception to the seal without unsealing the worktree.

## What it can allow

- **A domain** — adds a host to `./.claude/settings.json` sandbox network allowlist,
  e.g. `registry.npmjs.org`, `github.com`, an internal artifact registry.
- **A write path** — adds a directory to the hook boundary allowlist
  (`~/.claude/patronum-seal.json`) and to the project sandbox `allowWrite` list.

## Steps

### 1. Parse the request

From `$ARGUMENTS` or the conversation, determine whether the user wants to allow a
**domain** or a **path**, and the exact value. Prefer the narrowest value (a
specific host, not a wildcard; a specific subdirectory, not `/`).

### 2. Confirm

Use `AskUserQuestion` to confirm the exact domain/path. Warn if it is broad
(wildcards, a home directory, `/`) since that weakens the seal.

### 3. Apply

Run one of:
```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-allow.sh" --domain "<host>"
bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-allow.sh" --path "<dir>"
```

### 4. Confirm

Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-status.sh"`. Note that domain and
sandbox-write changes take effect on the next session; hook boundary paths apply
immediately.
