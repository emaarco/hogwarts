---
name: patronum-verify
description: "Run agento-patronum self-test to verify hook enforcement is working."
disable-model-invocation: true
allowed-tools: Bash(bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-verify.sh")
---

# Skill: patronum-verify

Run the agento-patronum self-test.

## Steps

1. Run: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/patronum-verify.sh"`
2. Present the results to the user.
3. If any tests fail, diagnose from the script output itself — its Installation Check section already reports whether `jq` is installed and whether `~/.claude/patronum.json` exists and is valid JSON. Suggest running setup again if files are missing.
4. If a previous run was interrupted, the self-test may have left the live config renamed to `~/.claude/patronum.json.verify-absent` (protection silently disabled). Tell the user to check for that file and rename it back to `~/.claude/patronum.json`.
