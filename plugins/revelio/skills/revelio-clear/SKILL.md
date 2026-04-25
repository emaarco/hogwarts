---
name: revelio-clear
description: Clear (truncate) the Revelio log after explicit user confirmation. Use when the user asks to wipe, clear, reset, or obliviate the Revelio log, or runs /revelio-clear.
allowed-tools: Bash(wc:*), Bash(test:*), Bash(: >*)
---

# /revelio-clear

Truncate `${CLAUDE_PROJECT_DIR}/.claude/logs/revelio.jsonl`.

## Steps

### 1. Count current entries
If the file does not exist, reply:

> Nothing to obliviate — the log is already empty.

Then stop.

Otherwise run `wc -l < "${CLAUDE_PROJECT_DIR}/.claude/logs/revelio.jsonl"` to get N.

### 2. Ask for explicit confirmation
Ask:

> Obliviate N entries from .claude/logs/revelio.jsonl? Reply `yes` to confirm.

Do NOT proceed until the user replies `yes` (case-insensitive, trimmed). Any other reply: reply "Cancelled." and stop.

### 3. Truncate in place
Run: `: > "${CLAUDE_PROJECT_DIR}/.claude/logs/revelio.jsonl"`

Keep the file present so later writes need no mkdir.

### 4. Confirm
Reply: `Obliviate. N entries erased.`
