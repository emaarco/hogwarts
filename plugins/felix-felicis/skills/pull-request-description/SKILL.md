---
name: pull-request-description
allowed-tools: Bash(git *), Bash(gh *), Bash(glab *), Read, Grep, Glob, AskUserQuestion
description: "Draft a consistent pull-request / merge-request title and body — a Conventional-Commit title (respecting repo-defined types & scopes) and a structured, compact body that links its issue — then create or update the PR/MR. Use when opening a PR or MR, writing a PR description or body, or asked to make PR titles and descriptions consistent."
---

# Skill: pull-request-description

Draft a consistent, compact PR/MR **title** and **body**, then create or update the PR/MR.
Goal: a structured, compact write-up that — in the best case — always links the issue it builds on.

## IMPORTANT

- GitHub → `gh` CLI. GitLab → `glab` CLI. Never call the forge APIs directly.
- Write the title and body in **English**, even when the conversation is in another language.
- **Repo conventions win.** Only fall back to the bundled defaults when the repo defines none.
- Always show the full draft and confirm before creating or updating anything.
- If a required CLI is missing, abort and ask the user to install it, then restart the skill.
- When a `gh`/`glab` call fails, use AskUserQuestion to ask how to proceed (retry / stop / other).

## Instructions

### Step 1 — Gather the change

- **Base branch**: default to the repo's default branch (`gh repo view --json defaultBranchRef`
  or `git remote show origin`) unless the user names another.
- **Commits & diff**:
  ```bash
  git log --oneline <base>..HEAD
  git diff --stat <base>...HEAD
  ```
  Read enough of the actual diff to describe *why* and *what* accurately. Never invent changes.
- **Detect the forge**: inspect `git remote -v` — `github.com` → GitHub, `gitlab` → GitLab.

### Step 2 — Find the linked issue

Best-case PRs link the issue they build on. Look, in order:

1. Branch name (e.g. `123-…`, `feature/PROJ-123`, `fix/#123`).
2. Commit messages / bodies (`#123`, `Closes #123`, `PROJ-123`).
3. The user's input / conversation context.
4. If none found, ask via AskUserQuestion whether an issue exists — but don't block if there
   genuinely is none.

Pick the link keyword:

- Same-repo issue this PR **resolves** → closing keyword (`Closes #NN`) so it auto-closes on
  merge (only works when the PR targets the default branch).
- Otherwise → a non-closing reference (`Refs #NN`, `Part of #NN`), or the full issue URL for
  cross-repo issues or external trackers (e.g. Jira).

### Step 3 — Discover title conventions

Default: **Conventional Commits** — `type(scope): subject` — unless the repo says otherwise.
Search for repo-defined rules (allowed types / scopes), in priority order:

1. **commitlint** — `commitlint.config.{js,cjs,mjs,ts}`, `.commitlintrc*`, or
   `package.json#commitlint`. Read the `type-enum` / `scope-enum` rules.
2. **release-please** — `release-please-config.json` / `.release-please-manifest.json`: in a
   monorepo the package keys are the valid scopes (one scope per package).
3. **PR-title lint workflow** — `.github/workflows/*` using e.g.
   `amannn/action-semantic-pull-request` (`types:` / `scopes:` inputs).
4. **CONTRIBUTING.md** — documented commit / PR conventions.
5. **Fallback scope** — infer from the changed top-level package/folder (monorepo: `plugins/<x>`
   → scope `<x>`); omit the scope if the change is repo-wide or the repo doesn't use scopes.

Rules (see `references/title-conventions.md` for the full type list):

- Subject: imperative mood, lower-case start, no trailing period, ≤ ~72 chars.
- Breaking change → `type(scope)!: …` (and describe it in the body).
- If the repo squash-merges, the PR title becomes the commit message — it **must** be a valid
  Conventional Commit.

### Step 4 — Discover body conventions

1. **GitHub template** — `.github/PULL_REQUEST_TEMPLATE.md`, `.github/PULL_REQUEST_TEMPLATE/*.md`,
   `PULL_REQUEST_TEMPLATE.md`, or `docs/…`.
2. **GitLab template** — `.gitlab/merge_request_templates/*.md`.
3. **CONTRIBUTING.md** — sections describing the expected PR/MR structure.
4. **Fallback** — the bundled `references/pr-body-template.md`.

If a repo template exists, follow it and fill only the sections you have real content for.

### Step 5 — Draft

Compose the title (Step 3) and body (Step 4). Keep it **compact**:

- **Why** before **What**; bullets over prose; no filler.
- Put the issue link where the template expects it, otherwise as the **last line** of the body.
- Include optional sections (breaking changes, out-of-scope, screenshots) only when they add value.

### Step 6 — Show & confirm

Present the full title + body and use AskUserQuestion: **create / edit / cancel**. Also confirm
whether to create a new PR/MR or update the branch's existing one (`gh pr view` / `glab mr view`).
Apply edits and re-show if requested.

### Step 7 — Create or update

Write the body to a temp file and pass it as a file to avoid shell-quoting issues.

**GitHub:**
```bash
gh pr create --base <base> --title "<title>" --body-file <file>
gh pr edit <number> --title "<title>" --body-file <file>
```

**GitLab:**
```bash
glab mr create --target-branch <base> --title "<title>" --description "$(cat <file>)"
glab mr update <iid> --title "<title>" --description "$(cat <file>)"
```

### Step 8 — Report

Show the final PR/MR URL and the linked issue:
```bash
gh pr view <number> --json url,title --jq '.url'   # GitHub
glab mr view <iid>                                  # GitLab
```
