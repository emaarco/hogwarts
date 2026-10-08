---
name: create-github-ticket
allowed-tools: Bash(gh *), WebSearch, WebFetch
description: Create or update GitHub issues (bug reports, feature requests, refactor tasks) using the gh CLI. Use when the user wants to file a ticket, create or update an issue, report a bug, request a feature, plan a refactor, create a task, or track work in GitHub Issues.
---

# Skill: create-ticket

Create or update a GitHub issue (feature request, bug report, or refactor task).

## IMPORTANT

- Always use gh CLI to create or update tickets. Never call the GitHub API directly.
- If gh CLI is not available, abort and ask the user to install it. The user must restart the skill then.
- When any gh call fails, use AskUserQuestion to ask the user what to do (repeat, stop, do something else).

## Instructions

### Step 1 – Determine mode

Inspect `$ARGUMENTS`:

- If context contains `update` and/or an issue number or GitHub issue URL → **update mode**.
- Otherwise → **create mode**.
- If create mode does not make sense based on context, use AskUserQuestion.

### Step 2 – Gather information

**Create mode:**

- Extract issue type (`feature`, `bug`, `refactor`) from `$ARGUMENTS`; if missing, ask the user.
- For `feature`: understand the desired behaviour and why it is needed.
- For `bug`: understand current vs. expected behaviour and reproduction steps.
- For `refactor`: understand scope, motivation, and target state.

**Update mode:**

- Fetch the issue: `gh issue view <number-or-url>`.

### Step 3 – Research (optional)

If the issue involves a specific library, framework version, API, or configuration that you are not
fully certain about, use AskUserQuestion to ask:
*"Should I search online for [topic] to get accurate details before drafting?"*
If yes, use `WebSearch` / `WebFetch` to collect relevant facts and incorporate them into the draft.
Skip this step if you already have sufficient knowledge.

### Step 4 – Discover issue templates

Locate the issue templates to use for structuring the issue body:

1. **Check the current repo** — look for `.github/ISSUE_TEMPLATE/` in the git repo root.
2. **Check a referenced repo** — if not inside a repo but a repo is referenced (via URL or gh context), attempt:
   ```bash
   gh api repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE --jq '.[].name'
   ```
   Then fetch individual templates as needed.
3. **Fallback** — if no templates are found by either method, use AskUserQuestion to ask the user:
   - *"I couldn't find issue templates in the repository. You can either:*
     *a) Provide a link to your issue templates, or*
     *b) Use the built-in defaults."*
   - If the user provides a link, fetch and parse those templates.
   - If the user chooses defaults, read the matching template from `references/`:
     - `feature` → `references/feature-template.md`
     - `bug` → `references/bug-template.md`
     - `refactor` → `references/refactor-template.md`

When repo templates are found (YAML format), extract the `title` prefix, `labels`, and every
`textarea`/`input`/`dropdown` field (`label` + `description`) to compose the issue body.

### Step 5 – Draft

Compose the issue title and body following the discovered or default template structure.
Apply appropriate labels based on issue type.

**No manual line breaks inside a sentence or list item** — write each paragraph and list item as one continuous line and let GitHub soft-wrap it. Break only where Markdown needs it: between blocks, between list items, in tables, and inside code blocks. A hard-wrapped line that starts with `#123` or `-` can render as a heading or list item, and the wrapped source is awkward to edit.

### Step 6 – Show and confirm

Present the full draft (create) or the current state + proposed changes (update) and use
AskUserQuestion: *"Proceed? (yes / edit / cancel)"*. Apply edits and re-show if requested.

### Step 7 – Create or update

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

### Step 8 – Report

Run `gh issue view <number>` and show the final issue state with its URL.
