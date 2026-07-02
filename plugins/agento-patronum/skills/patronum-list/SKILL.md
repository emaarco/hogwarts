---
name: patronum-list
description: "Show all patterns currently protected by agento-patronum. Use when the user asks what is protected, whether a specific file or command is blocked, or wants to review the current protection shield."
allowed-tools: Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-list.sh")
---

# Skill: patronum-list

Show all active protection patterns.

## Steps

### 1. Fetch patterns

Run: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-list.sh"`

### 2. Present as themed table

Format the output as a markdown table with the following columns, consistent with the documentation at `docs/commands/list.md`:

**Protection Shield**

| Pattern | Source | Reason |
|---------|--------|--------|
| `**/.env` | default | Environment files may contain credentials |
| ... | ... | ... |

Group patterns by source (`default` first, then `user`) for readability.
Show the total count at the end.

### 3. If empty or missing

If no patterns are configured, suggest:
- Use `/patronum-suggest` to get stack-specific recommendations
- Use `/patronum-add` to manually add patterns

If the script errors because `~/.claude/patronum.json` is missing, do not render a table — tell the user the config is absent and suggest running `/patronum-verify` to check the setup.
