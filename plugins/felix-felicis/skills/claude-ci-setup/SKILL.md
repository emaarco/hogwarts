---
name: claude-ci-setup
description: "Guided setup for running Claude unattended in GitHub Actions: checks the Claude GitHub App, a default-branch-restricted environment, the subscription token, and the absence of pay-per-token credentials, then adds the workflow for each chosen use case. Use when asked to set up or audit Claude / claude-code-action in CI, or to let Claude repair red Dependabot PRs."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, AskUserQuestion
---

# Skill: claude-ci-setup

Gets a repo ready to run Claude unattended in GitHub Actions, then adds one small workflow per use case. Every prerequisite is **checked first**: skip what is already done, fix what you can, and ask only where you cannot check. Run on a repo that already has Claude in CI, the same checks work as an audit — report each gap with evidence and change nothing without confirmation.

**Unlisted beta.** The dependency-repair template has not completed a real repair run yet. Say so when you hand over.

GitHub-only. Precondition: `gh auth status` authenticated with **admin** rights on the target repo (environments and secrets need it). Sibling skills own the neighbouring concerns: **`pin-github-actions`** (SHA-pinning), **`dependency-update-shepherd`** (the repair itself), **`automerge-setup`** (auto-merge for the green PRs).

## IMPORTANT — the token never passes through you

Never run `claude setup-token`, never read, echo, or accept the token in chat, and never pass it as a command argument. Print the commands; the user runs them in their own terminal. If the user pastes a token anyway, tell them to revoke it and create a new one.

## Phase 0 — Detect

```bash
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)
grep -rln "claude-code-action" .github/workflows/ 2>/dev/null   # existing Claude workflows → audit mode
ls .github/dependabot.yml renovate.json* .renovaterc* 2>/dev/null
```

Ask via **AskUserQuestion** only what cannot be detected:

1. **Billing** — **subscription token** `CLAUDE_CODE_OAUTH_TOKEN` *(recommended — flat rate, valid one year)* / **API key** `ANTHROPIC_API_KEY` (billed per token).
2. **Environment name** — reuse an existing environment a Claude workflow already references, else `claude-maintenance` *(recommended)*.

## Phase 1 — Foundation

One step at a time. Run the check; act only if it fails; re-run the check before moving on.

| # | Step | Check | If missing |
|---|---|---|---|
| 1 | Claude GitHub App installed on the repo | `gh api "orgs/${REPO%%/*}/installations" --jq '.installations[] \| select(.app_slug=="claude") \| .repository_selection'` | Link to https://github.com/apps/claude, wait for confirmation, re-check |
| 2 | Environment restricted to the default branch | `gh api "repos/$REPO/environments/$ENV/deployment-branch-policies" --jq '.branch_policies[].name'` | Create it (commands below) |
| 3 | Token stored as an **environment** secret | `gh secret list --env "$ENV" --repo "$REPO" --json name --jq '.[].name'` | Print the commands for the user, wait, re-check |
| 4 | No pay-per-token credential in reach | `gh secret list --repo "$REPO" --json name --jq '.[].name'` and `gh api "repos/$REPO/actions/organization-secrets" --jq '.secrets[].name'` | Warn and ask how to proceed |

**Step 1.** The check needs org-owner rights and fails on user-owned repos; on a 403/404 ask the user instead of guessing. `repository_selection: selected` does not prove this repo is included — ask then too. Why it matters: pushes made with `GITHUB_TOKEN` do not start CI, so a repair pushed without the app is never verified.

**Step 2.** An environment whose only branch policy is the default branch keeps the token away from workflows on pull-request branches. A plain repo secret is readable by any workflow on any branch.

```bash
gh api --silent --method PUT "repos/$REPO/environments/$ENV" \
  -F "deployment_branch_policy[protected_branches]=false" \
  -F "deployment_branch_policy[custom_branch_policies]=true"
gh api --silent --method POST "repos/$REPO/environments/$ENV/deployment-branch-policies" -f name="$DEFAULT_BRANCH"
```

An existing environment with other branch policies, or none, is a finding: show it and ask before changing it.

**Step 3.** Hand these over with `$ENV` and `$REPO` filled in; `gh` prompts for the value, so it stays out of the shell history:

```bash
claude setup-token
gh secret set CLAUDE_CODE_OAUTH_TOKEN --env "$ENV" --repo "$REPO"
```

The same token as a repo-level secret is a finding: recommend deleting it there (`gh secret delete CLAUDE_CODE_OAUTH_TOKEN --repo "$REPO"`), after confirmation.

**Step 4.** With subscription billing, an `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` secret at repo, environment, or org level silently outranks the subscription token and bills per token. If one exists, ask: delete it (recommended, if nothing else uses it — grep the workflows first) / keep it and rely on the workflow's guard step, which then fails every run until the secret is gone. Skip this step when the user chose API-key billing.

## Phase 2 — Use cases

Ask via **AskUserQuestion** (multi-select) which use cases to add. Each is a template under `reference/` next to this SKILL.md plus the few values it needs.

| Use case | Template | Status |
|---|---|---|
| **Dependency repair** — a red Dependabot PR gets one pass of `dependency-update-shepherd`; never merges | `reference/dependency-repair-workflow.yml` | unproven |

Not shipped yet: `@claude` mentions, PR review, CI auto-fix for non-bot PRs, issue triage, scheduled runs. For those, point the user at the examples in https://github.com/anthropics/claude-code-action and keep the Phase 1 foundation.

### Dependency repair

Needs Dependabot (`.github/dependabot.yml`); Renovate uses a different actor and is not covered — stop and say so. Fill the placeholders:

- `<CI_WORKFLOW_NAME>` — the `name:` of every workflow whose failure should trigger a repair: `grep -l "pull_request" .github/workflows/*.yml | xargs grep -m1 "^name:"`. Several match → ask which.
- `<ENVIRONMENT>` — `$ENV` from Phase 0.
- `<TOOLCHAIN_STEPS>` — copy the setup steps (Node, JDK, Gradle, …) from that CI workflow.

Copy the template to `.github/workflows/dependency-repair.yml`, **stripping its teaching comments** (keep at most a one-line label per step, in the repo's comment style). An existing file is updated gap by gap, never overwritten blind. With API-key billing, drop the guard step and pass `anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}` instead of the OAuth token.

Keep these properties, and check them when auditing an existing workflow:

- **Trigger** — `workflow_run` on the CI workflow, not `pull_request`: Dependabot `pull_request` runs get no Actions secrets.
- **Gate** — conclusion `failure`, actor `dependabot[bot]`, and a same-repo pull request. The actor gate is also the loop guard: Claude's own pushes re-run CI under the app's actor.
- **`allowed_bots: "dependabot[bot]"`** — the action rejects bot actors otherwise.
- **`persist-credentials: false`** on checkout, so the push uses the app's token and starts CI.
- **Auto-merge switched off before the repair**, and no merge step anywhere.
- **`environment:`** set, and the token read from nowhere else.

## Phase 3 — Hand-over

1. SHA-pin every `uses:` to its current release — delegate to **`pin-github-actions`** rather than trusting the SHAs in the template.
2. `actionlint .github/workflows/<file>.yml` (not installed → `python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" <file>` and say the lint was skipped).
3. Report the foundation as a table (step, state, evidence) and list what only the first real run can confirm:
   - `workflow_run` fires only from the default branch — nothing happens until the workflow is merged and the next Dependabot PR goes red.
   - The repair is pushed with the app's token and CI re-runs on it.
   - `plugins: "felix-felicis@emaarco"` resolves from the marketplace.
   - The job token is allowed to switch auto-merge off.
   - The run shows subscription usage, not API billing.

## Sources

- claude-code-action (inputs, `allowed_bots`, examples): https://github.com/anthropics/claude-code-action
- Environments and deployment branch policies: https://docs.github.com/en/rest/deployments/branch-policies
- Dependabot and Actions secrets: https://docs.github.com/en/code-security/dependabot/working-with-dependabot/automating-dependabot-with-github-actions
- Triggering a workflow from a workflow (`GITHUB_TOKEN` pushes): https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow
- Reference implementation: https://github.com/miragon-blueprints/cibseven-embedded-example/pull/28
