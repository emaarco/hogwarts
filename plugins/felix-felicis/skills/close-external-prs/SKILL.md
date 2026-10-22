---
name: close-external-prs
description: "Stops accepting pull requests from external contributors on a GitHub repo via the gh CLI: restricts PR creation to collaborators, closes every open external PR with a friendly comment that points to issues instead, and notes the policy in CONTRIBUTING.md. Use when asked to stop, block, or close external / outside / community pull requests, or to make a repo collaborators-only for PRs."
allowed-tools: Bash, AskUserQuestion
---

# Skill: close-external-prs

Three things per repository: **lock** new external PRs, **close** the open ones with a comment, and **document** the policy in CONTRIBUTING.md. Issues stay open to everyone — they are where external contributors are sent instead.

Precondition: `gh auth status` must be authenticated with **admin** rights on the target repo. Resolve the target once:

```bash
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
```

If the user names several repos (or an org), run every step per repo.

## Step 1 — Restrict PR creation to collaborators

GitHub has a repository setting (Feb 2026) that limits **creating** pull requests to users with write access. Look for its API field instead of guessing a name:

```bash
gh api "repos/$REPO" | jq 'with_entries(select(.key | test("pull_request")))'
```

- **A field describing who may create PRs is present** → set it to the collaborators-only value with `gh api -X PATCH "repos/$REPO" -f <field>=<value>`, then re-read it to verify.
- **No such field** → tell the user to set it in the UI: *Settings → General → Features → Pull requests → Collaborators only*. Give them the URL `https://github.com/$REPO/settings` and wait for confirmation.

Do **not** use `PUT /repos/{owner}/{repo}/interaction-limits` with `collaborators_only`: it expires after at most six months and also blocks external issues and comments — the opposite of what the closing comment promises.

## Step 2 — Find open external PRs

External means the author is not an owner, member, or collaborator. Bots (Dependabot, Renovate) are not external:

```bash
gh pr list --repo "$REPO" --state open --limit 500 \
  --json number,title,author,authorAssociation,url \
  --jq '.[] | select(.authorAssociation | IN("OWNER","MEMBER","COLLABORATOR") | not)
              | select(.author.is_bot | not)'
```

Show the list (number, title, author) and ask via `AskUserQuestion` whether to close all, a subset, or none. Closing is visible to the authors — never close without this confirmation.

## Step 3 — Close with the comment

The comment text lives in [`references/closing-comment.md`](references/closing-comment.md) (next to this SKILL.md). Pass it as `--body-file` and close each confirmed PR:

```bash
COMMENT_FILE="<this skill's directory>/references/closing-comment.md"

for PR_NUMBER in <confirmed numbers>; do
  gh pr comment "$PR_NUMBER" --repo "$REPO" --body-file "$COMMENT_FILE"
  gh pr close "$PR_NUMBER" --repo "$REPO"
done
```

Comment first, then close, so the author is notified with the reason. Do not delete branches — they live in the contributors' forks.

## Step 4 — Note the policy in CONTRIBUTING.md

The section text lives in [`references/contributing-section.md`](references/contributing-section.md). Locate the guide where GitHub looks for it — `.github/CONTRIBUTING.md`, `CONTRIBUTING.md`, or `docs/CONTRIBUTING.md` (case-insensitive):

- **Guide exists** → insert the reference section right after the intro, before the first `##` section. Keep existing pull-request guidance (small PRs, local checks, commit conventions) — it still applies to the team. If the guide already states the policy, leave it.
- **No guide** → create `CONTRIBUTING.md` with a `# Contributing` heading followed by the reference section.

Rewrite the issue link to an absolute `https://github.com/$REPO/issues/new`. Commit on a new branch with `docs: note that external pull requests are not accepted` and open a PR — never push to the default branch directly.

## Report

Per repo: whether PR creation is now collaborators-only (API or UI), the list of closed PRs with links, and the link to the CONTRIBUTING.md PR.
