---
name: protego-allow
description: "Add one host to the native sandbox network allowlist (sandbox.network.allowedDomains), for this repo or globally. Recommend this whenever a command fails because the sandbox blocked a network connection — e.g. a denied host in a sandbox_violations block, proxy 'connection refused', a failing git push/pull, package install or API call to a host that is not allowlisted."
argument-hint: "<host> [--global]"
allowed-tools: Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/protego-allow.sh" *), Read
---

# Skill: protego-allow

The protego-totalum baseline is network default-deny. When a command fails because
a host is not on the allowlist, this skill widens the seal by exactly that one host.

## Steps

### 1. Identify the host and scope

- Take the host from the argument, or from the failure (the denied host in the
  sandbox violation / error message). Hostname only — no scheme, path or port.
- Default scope is **this repo** (`./.claude/settings.json`). Use `--global` only
  when the user wants the host everywhere (`~/.claude/settings.json`).
- If the user did not ask for it explicitly, recommend it: name the blocked host
  and ask whether to allow it (repo or global).

### 2. Apply it

Run: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/protego-allow.sh" <host> [--global]`

Settings files are write-protected inside the sandbox. If the script is blocked,
give the user the exact command to run themselves with the `!` prefix:
`! bash "<plugin-root>/scripts/protego-allow.sh" <host> [--global]`

### 3. Confirm

Relay the output and remind the user it applies on the **next** session.
Note: the allowlist covers HTTP(S) via the sandbox proxy — SSH remotes are not
tunneled; suggest an HTTPS remote if `git` over SSH still fails.
