---
name: patronum-remove
argument-hint: "\"<pattern>\""
description: "Remove a pattern from the agento-patronum protection list. Use when the user wants to unblock access to a file or command."
allowed-tools: Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-remove.sh" *), Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-list.sh"), AskUserQuestion
---

# Skill: patronum-remove

Remove a protection pattern from the agento-patronum shield.

## Steps

### 1. Show current protections

Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-list.sh"` to get all current patterns.

### 2. Identify the pattern to remove

Match the user's request from $ARGUMENTS against the current list.
If the match is ambiguous or no exact match is found, present the full list and ask the user to clarify.

### 3. Confirm removal

Use `AskUserQuestion` to confirm the removal. Present:
- The exact pattern to be removed
- Its source (`default` or `user`) and reason
- A warning if removing a default pattern — it won't come back unless manually re-added

### 4. Remove the pattern

After the user confirms, run the script with the exact pattern string identified in Step 2 and confirmed in Step 3 — never raw $ARGUMENTS (the script requires an exact match against the stored pattern):
```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-remove.sh" "<exact-pattern>"
```

### 5. Present updated list

Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-list.sh"` again and present the updated protection list as a markdown table:

| Pattern | Source | Reason |
|---------|--------|--------|
