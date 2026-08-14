---
name: patronum-status
description: "Show which protection layers are active for the current worktree — static file protection, the native OS sandbox, and the egress/boundary seal hook. Use when the user asks whether the repo is sealed or isolated, or what protection is active."
allowed-tools: Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-status.sh")
---

# Skill: patronum-status

Report the full protection posture for the current directory.

## Steps

### 1. Fetch status

Run: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-status.sh"`

### 2. Summarise

Present the three layers clearly:
- **Static protection** — sensitive-file/command blocking (`patronum-hook`).
- **Seal Layer 1** — native OS sandbox (`sandbox.enabled` in user/project/managed settings).
- **Seal Layer 2** — the PreToolUse egress/boundary hook.

If the native sandbox is `off` at every scope, recommend `/patronum-seal`.
If a project legitimately needs a domain or write path, recommend `/patronum-allow`.
Remind the user native-sandbox changes apply on the next session.
