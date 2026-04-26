---
name: make-me-awesome
description: "Analyze a GitHub repo and submit it to an awesome list via PR or issue. Usage: /make-me-awesome [REPO_TO_PROMOTE] [AWESOME_LIST_REPO]"
allowed-tools: AskUserQuestion, WebFetch, WebSearch, Bash
---

# Skill: make-me-awesome

Analyzes a GitHub repository and adds it to an awesome list by submitting a PR or issue.

## Step 1 — Collect inputs

If `[REPO_TO_PROMOTE]` or `[AWESOME_LIST_REPO]` were not provided, ask via `AskUserQuestion`:
- URL or `owner/repo` of the repository to promote
- URL or `owner/repo` of the target awesome list

## Step 2 — Analyze the repo to promote

Fetch the README and key source files of `[REPO_TO_PROMOTE]`:

```bash
gh repo view [REPO_TO_PROMOTE] --json description,homepageUrl,topics,languages
```

Summarize internally:
- What problem it solves
- Unique selling points vs. similar tools
- Key features, languages/frameworks/platforms
- Any documentation site or homepage worth linking

## Step 3 — Analyze the awesome list

Fetch the README of `[AWESOME_LIST_REPO]` and any CONTRIBUTING.md. Note:
- Available categories and which fits best — propose a new one if none fits, and write a one-line section description for it
- **Entry format:** match exactly (typically `- [name](url) - description.` with a single hyphen, not an em dash)
- Submission rules or preferences (PR vs. issue)

## Step 4 — Research the maintainer(s)

```bash
gh api repos/[OWNER]/[REPO]/contributors --jq '.[0:5] | .[] | {login, contributions}'
gh api users/[OWNER] --jq '{name, bio, company, twitter_username}'
```

Determine whether it's a single maintainer or a team/org — this affects the tone of the submission.

## Step 5 — Confirm analysis and approach

Present a summary to the user via `AskUserQuestion` before drafting anything:

```
Here's my analysis:

Repo: [repo-name] — [one-line summary]
Awesome list: [awesome-list-name]
Best-fit category: [Category] (existing) / Proposed new category: "[Name]" — [one-line section description]
Submission method: PR / Issue (reason: [CONTRIBUTING.md or repo settings])
Maintainer: [single: FirstName] / [team/org: professional tone]

Does this look right? Should I adjust anything before I draft the entry?
```

Options: "Looks good, continue" / "Adjust category" / "Adjust submission method" / "Cancel"

## Step 6 — Draft the entry and PR/issue body

**Entry line** — match the list's existing format exactly. Typically:
```
- [repo-name](url) - Description sentence. Supports X, Y, Z.
```

**If proposing a new category**, also draft the section block:
```markdown
## [Category Name]

[One-line description of what belongs here.]

- [repo-name](url) - Description.
```

**PR/issue body — single maintainer:**
```
Hi [FirstName] — I'd like to suggest adding [repo-name]([url]), [one-line what it does].

It does two/three things:
- [key feature 1]
- [key feature 2]
- [key feature 3 — include docs/homepage link if available]

Since it's not [existing category A] or [existing category B], I proposed a new **[Category]** section. Happy to move it if you see a better fit.
```

**PR/issue body — team/org:**
```
Proposed addition: [repo-name]([url]) under **[Category]**.

[2–3 bullet points of key features, include docs/homepage link if available.]

Let me know if a different category or wording works better.
```

## Step 7 — Confirm entry and body

Show the user the full entry and PR/issue body via `AskUserQuestion` before touching anything:

```
Here's what I'd submit:

Entry:
  [entry line]

PR/issue body:
---
[full body]
---

Does this look good, or would you like to adjust the wording?
```

Options: "Submit as-is" / "Edit entry" / "Edit body" / "Cancel"

## Step 8 — Fork, edit, and submit

### Via PR:

**8a — Ensure the fork exists (create only if needed):**
```bash
# Check if a fork already exists under the authenticated user
gh repo view [GITHUB_USER]/[REPO] --json name 2>/dev/null \
  || gh repo fork [AWESOME_LIST_REPO] --clone=false
```

**8b — Determine the upstream default branch:**
```bash
gh repo view [AWESOME_LIST_REPO] --json defaultBranchRef --jq '.defaultBranchRef.name'
# → typically "main" or "master", call it [DEFAULT_BRANCH]
```

**8c — Sync the fork's default branch with upstream, then create a feature branch:**
```bash
# Clone the fork locally
gh repo clone [GITHUB_USER]/[REPO] /tmp/[REPO]-awesome

cd /tmp/[REPO]-awesome

# Add upstream remote and fetch
git remote add upstream https://github.com/[AWESOME_LIST_REPO].git
git fetch upstream

# Reset local default branch to upstream (handles stale forks)
git checkout [DEFAULT_BRANCH]
git reset --hard upstream/[DEFAULT_BRANCH]

# Create a dedicated feature branch — never commit on [DEFAULT_BRANCH]
git checkout -b add-[repo-name]
```

**8d — Insert the entry and push:**
```bash
# Edit README.md to insert the entry line at the correct position

git add README.md
git commit -m "feat: add [repo-name] under [Category]"
git push origin add-[repo-name]
```

**8e — Open the PR against the upstream repo:**
```bash
gh pr create --repo [AWESOME_LIST_REPO] \
  --head [GITHUB_USER]:add-[repo-name] \
  --base [DEFAULT_BRANCH] \
  --title "feat: add [repo-name] under [Category]" \
  --body "..."
```

**Cleanup:**
```bash
rm -rf /tmp/[REPO]-awesome
```

### Via issue:

```bash
gh issue create --repo [AWESOME_LIST_REPO] \
  --title "Add [repo-name]" \
  --body "..."
```

## Step 9 — Report

Output:
- The exact entry that was added
- The category it was placed in (new or existing)
- The direct link to the PR or issue
