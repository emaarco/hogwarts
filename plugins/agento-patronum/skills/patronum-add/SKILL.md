---
name: patronum-add
argument-hint: "\"<pattern>\" [--reason \"reason\"]"
description: "Add a file pattern or command to the agento-patronum protection list. Use when the user wants to block access to a file, path, or command."
allowed-tools: Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-add.sh" *), Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-list.sh"), AskUserQuestion
---

# Skill: patronum-add

Add a protection pattern to the agento-patronum shield.

## Pattern formats

- **File globs** — matched against file paths: `**/.env`, `~/.aws/credentials`, `**/*.tfstate`
- **Commands** — must be wrapped as `Bash(<command>)`, e.g. `Bash(printenv)`; the hook prefix-matches the command inside the parentheses. A bare command name like `printenv` is treated as a file glob and will NOT block the command. Details: `docs/rules/bash-commands.md`.

## Steps

### 1. Parse input

Parse the user's input from $ARGUMENTS. Expect a pattern and an optional `--reason`.
If the user described what to protect conversationally, derive the concrete pattern yourself using the formats above (wrap commands as `Bash(<command>)`).
If no reason is provided, generate a short reason based on what the pattern protects.

### 2. Confirm with user

Use `AskUserQuestion` to confirm the addition. Present:
- The pattern to be added
- The reason (provided or generated)
- A warning if the pattern looks overly broad (e.g. `*`, `**/*`, or very short globs)

### 3. Add the pattern

After the user confirms, run the script with the pattern and reason from Steps 1–2 (never raw $ARGUMENTS):
```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-add.sh" "<pattern>" --reason "<reason>"
```

If the script reports the pattern already exists, tell the user it was already protected and stop — do not present it as a new addition.

### 4. Present result

Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-list.sh"` and present the updated protection list as a markdown table:

| Pattern | Source | Reason |
|---------|--------|--------|

Highlight the newly added entry.
