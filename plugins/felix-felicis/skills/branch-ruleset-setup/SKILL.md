---
name: branch-ruleset-setup
description: "Sets up a GitHub branch ruleset protecting the default branch via the gh CLI: no deletion, no force-push, linear history, signed commits, PR-only changes, and a required CI status check with a dynamically resolved integration_id. Idempotent — creates the ruleset or updates an existing one. Use when asked to protect the default branch, set up branch protection or rulesets, or require status checks before merge."
allowed-tools: Bash, Read, Write, Grep, Glob, AskUserQuestion
---

# Skill: branch-ruleset-setup

Configures a **repository ruleset** (not classic branch protection) named `main` targeting the default branch (`~DEFAULT_BRANCH`). Everything runs through the `gh` CLI with the ruleset passed as **inline JSON via heredoc** — never create a ruleset JSON file in the repo.

Run this when asked to "protect main", set up branch protection / a branch ruleset, or as the branch-protection slice of a release/supply-chain audit (see the sibling skill **`release-audit`**).

Precondition: `gh auth status` must be authenticated with **admin** rights on the target repo.

## Phase 0 — Ensure a referenceable CI check exists

A required status check only makes sense if the CI job actually exists. Never hardcode the check name — detect it:

```bash
ls .github/workflows/ 2>/dev/null
grep -rl "pull_request" .github/workflows/ 2>/dev/null
```

- **A `pull_request`-triggered workflow exists** → note its job name (= the status-check `context`). If the job is called `ci` or `test` instead of `build`, use that name below.
- **No workflow exists** → create a minimal one first, commit it to the default branch, and let it run **at least once** so the check context exists. Example (`.github/workflows/build.yml` — adapt steps to the repo's actual stack):

  ```yaml
  name: Build
  on:
    pull_request:
      branches: [main]
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v6
        - uses: actions/setup-node@v6
          with:
            node-version: '24'
        - run: npm ci
        - run: npm test
        - run: npm run build
  ```

## Phase 1 — Resolve the integration_id dynamically

The check is reported by GitHub Actions, whose app ID can vary by context — never hardcode a number like `15368`:

```bash
ACTIONS_APP_ID=$(gh api /apps/github-actions --jq .id)
echo "GitHub Actions integration_id = ${ACTIONS_APP_ID}"
```

If the check is reported by a different CI provider, resolve its app ID from a commit where the check already ran:

```bash
gh api repos/{owner}/{repo}/commits/<sha>/check-runs --jq '.check_runs[] | {name, app: .app.id}'
```

## Phase 2 — Check for an existing ruleset (idempotency)

```bash
RULESET_ID=$(gh api repos/{owner}/{repo}/rulesets --jq '.[] | select(.name=="main") | .id')
```

- Empty → **create** with `POST` (Phase 3).
- Present → **update** with `PUT` on `.../rulesets/${RULESET_ID}` — same body, different method/URL — so no duplicate is created.

## Phase 3 — Create or update the ruleset

The `integration_id` is injected via an **unquoted heredoc** (`<<JSON` without quotes is intentional — only then does `${ACTIONS_APP_ID}` expand; the body contains no other `$`):

```bash
gh api --method POST repos/{owner}/{repo}/rulesets \
  -H "Accept: application/vnd.github+json" --input - <<JSON
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    { "type": "required_signatures" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["merge", "squash", "rebase"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "build", "integration_id": ${ACTIONS_APP_ID} }
        ]
      }
    }
  ],
  "bypass_actors": []
}
JSON
```

Replace `"build"` with the actual job name from Phase 0.

## Phase 4 — Verify

```bash
RULESET_ID=$(gh api repos/{owner}/{repo}/rulesets --jq '.[] | select(.name=="main") | .id')
gh api repos/{owner}/{repo}/rulesets/${RULESET_ID} --jq '{enforcement, target}'
gh api repos/{owner}/{repo}/rulesets/${RULESET_ID} --jq '.rules[].type'
gh api repos/{owner}/{repo}/rulesets/${RULESET_ID} \
  --jq '.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks'
```

Success criteria:

- Exactly **one** ruleset `main`, `enforcement: active`, `target: branch`, targeting `~DEFAULT_BRANCH`.
- `.rules[].type` contains: `deletion`, `non_fast_forward`, `required_linear_history`, `required_signatures`, `pull_request`, `required_status_checks`.
- The required status check has the **correct context** (job name from Phase 0) and a **resolved `integration_id`** (not empty, not hardcoded).

## What the rules do & how to adapt them

| Rule | Effect | Adapt when |
|---|---|---|
| `deletion` | Default branch cannot be deleted | — |
| `non_fast_forward` | No force-pushes | — |
| `required_linear_history` | Linear history enforced | Drop if the team uses merge commits from long-lived branches |
| `required_signatures` | Commits must be signed (GPG/SSH/S-MIME) | Requires signing to be set up for **all** committers — otherwise pushes/merges are rejected; drop if not. Note: commits made via the API by GitHub Apps (e.g. release-please with an app token — see **`release-please-setup`**) are signed by GitHub automatically |
| `pull_request` | Changes only via PR; 0 approvals by default | Raise `required_approving_review_count` to `1`+ for teams |
| `required_status_checks` | CI check must be green before merge | Omit `integration_id` to match any provider reporting that context (less strict); remove the whole block if there is no CI |
| `bypass_actors: []` | Nobody can bypass, not even admins | Add e.g. `{ "actor_id": <id>, "actor_type": "Team", "bypass_mode": "always" }` for a deliberate bypass |

## Sources

- Repository rulesets REST API: https://docs.github.com/en/rest/repos/rules
- About rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- Reference implementation: the active ruleset on https://github.com/emaarco/slidev-addon-bpmn
