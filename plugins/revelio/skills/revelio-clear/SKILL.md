---
name: revelio-clear
description: Clear (truncate) the Revelio log after explicit user confirmation. Use when the user asks to wipe, clear, reset, or obliviate the Revelio log, or runs /revelio-clear.
allowed-tools: Bash(wc:*), Bash(test:*), Bash(: >*), Bash(git rev-parse:*)
---

# /revelio-clear

Truncate the per-repo Revelio log.

## Steps

### 1. Locate the log and count entries
Resolve the project root yourself — `$CLAUDE_PROJECT_DIR` is only set for hook processes, not for these commands. Use it if set, otherwise `git rev-parse --show-toplevel`, otherwise the current working directory. The log is `<project root>/.claude/logs/revelio.jsonl`.

If the file does not exist or is empty (`test -s` fails), reply:

> Nothing to obliviate — the log is already empty.

Then stop.

Otherwise run `wc -l < "<log>"` to get N.

### 2. Ask for explicit confirmation
Ask:

> Obliviate N entries from .claude/logs/revelio.jsonl? Reply `yes` to confirm.

Do NOT proceed until the user replies `yes` (case-insensitive, trimmed). Any other reply: reply "Cancelled." and stop.

### 3. Truncate in place
Run: `: > "<log>"`

Keep the file present so later writes need no mkdir.

This clears only the per-repo log. If the shared fallback log `$HOME/.claude/logs/revelio.jsonl` exists and is non-empty, say so — it collects entries from sessions without a project dir, across all repos — and offer to clear it too, using the same confirmation flow.

### 4. Confirm
Reply: `Obliviate. N entries erased.`
