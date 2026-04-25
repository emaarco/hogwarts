---
name: create-ticket
argument-hint: "[feature|bug] \"<description>\" | update <issue-number-or-url>"
allowed-tools: Bash(gh *), AskUserQuestion
description: Create or update a GitHub issue for agento-patronum using the `gh` CLI. Use when the user asks to "file a bug", "create a feature request", "open a GitHub issue", or "update an existing one". Supports feature and bug issue types with structured templates; shows a draft for confirmation before creating or editing; looks up existing issues by number or URL for updates.
---

# Skill: create-ticket

Create or update a GitHub issue for this repository (feature request or bug report).

## IMPORTANT

- Always use gh-cli to create or update tickets.
- Never call the api directly.
- If gh-cli not available, abort the execution and ask the user to install it. The user must restart the skill then.
- When any gh call fails, ask the user what to do (repeat, stop, do something else).

## Instructions

### Step 1 – Determine mode

Inspect `$ARGUMENTS`:

- If context contains `update` and/or an issue number or GitHub issue URL, use update-mode.
- Otherwise use create-mode.
- If create-mode does not make sense based on your context, use AskUserQuestion to ask the user for more context.

### Step 2 – Gather information

For a new issue:

- Extract the issue type (`feature` or `bug`) from `$ARGUMENTS`; if missing, ask the user.
- For `feature`: understand the desired behaviour and why it is needed.
- For `bug`: understand the current vs. expected behaviour and reproduction steps; ask about OS and Claude Code version if relevant.

For an issue that needs to be updated:

- Fetch the issue using `gh issue view <number-or-url>`.

### Step 3 – Research (optional)

If the issue involves a specific library, API, or configuration that you are not fully certain about, ask the user:
*"Should I search online for [topic] to get accurate details before drafting?"*
If yes, use `WebSearch` / `WebFetch` to collect relevant facts, then incorporate them into the draft. Skip this step if you already have sufficient knowledge.

### Step 4 – Draft

Read the matching issue template from `.github/ISSUE_TEMPLATE/` to get the exact sections and labels:

- `feature` → `.github/ISSUE_TEMPLATE/feature_request.yml`
- `bug`     → `.github/ISSUE_TEMPLATE/bug_report.yml`

Extract the `title` prefix, `labels`, and every `textarea`/`input`/`dropdown`/`checkboxes` field (`label` + `description`) from the YAML to compose the issue body. Fill each section with the information gathered in Step 2.

### Step 5 – Show and confirm

Use `AskUserQuestion` to present the full draft (create) or the current state + proposed changes (update) and ask whether to proceed, edit, or cancel. Apply any requested edits and ask again before continuing.

### Step 6 – Create or update

Using the GitHub CLI:

- **Create**: `gh issue create --title "<title>" --body "<body>" --label "<label>"`
- **Update** (use whichever commands apply):
  ```bash
  gh issue edit <number> --title "<title>" --body "<body>"
  gh issue edit <number> --add-label "<label>" --remove-label "<label>"
  gh issue comment <number> --body "<comment>"
  gh issue close <number>
  gh issue reopen <number>
  ```

### Step 7 – Create and link a branch

Only for **create-mode** (skip for updates if the issue already has a linked branch):

- Branch name: `<type>/issue-<number>` — e.g. `fix/issue-39` or `feat/issue-120`
  - Use `fix` for bugs, `feat` for features
- Detect the default development branch (prefer `develop` over `main`/`master`):
  ```bash
  gh api repos/<owner>/<repo>/branches --jq '.[].name'
  ```
- Create the branch and link it to the issue:
  ```bash
  gh issue develop <number> --repo <owner>/<repo> --name <branch> --base <dev-branch>
  ```
  This creates the branch AND links it to the issue (visible in the issue's Development sidebar).

### Step 8 – Report

Run `gh issue view <number>` and show the final issue state with its URL.
