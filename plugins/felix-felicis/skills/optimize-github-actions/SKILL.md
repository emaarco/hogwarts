---
name: optimize-github-actions
description: "CI run-efficiency audit for GitHub Actions: detects duplicate PR runs (push + pull_request double-trigger), job explosion via matrix expansion, missing/miswired concurrency, noisy PR triggers, and merge-gate traps (paths-filtered required checks) — reports with live evidence from gh, then fixes trigger scoping safely without breaking required status checks. Use when checks run twice, a PR shows too many jobs, or CI minutes are too high."
allowed-tools: Bash, Read, Grep, Glob, Edit, WebFetch, AskUserQuestion
---

# Skill: optimize-github-actions

Audits a repository's GitHub Actions workflows for **wasted CI runs and job explosion**, then optionally fixes them. The classic symptom: a PR shows dozens of checks, every job appears twice, CI minutes double — because a workflow triggers on both `push` and `pull_request` and nothing deduplicates the two runs.

Run this when asked to "optimize CI", "why does every check run twice?", "too many jobs on my PR", "reduce CI minutes", or as a follow-up when a PR's check list looks inflated.

Scope: **run efficiency** (which runs happen, how many jobs, what gets cancelled). For SHA-pinning see the sibling skill **`pin-github-actions`**; for release automation see **`release-audit`**; for ruleset edits delegate to **`branch-ruleset-setup`**.

## Why the core anti-pattern is invisible to concurrency

A workflow with both triggers runs **twice per PR push** — and the usual concurrency group does *not* catch it, because the two events resolve to different refs:

| Event | `github.ref` |
|---|---|
| `push` to a PR branch | `refs/heads/<branch>` |
| `pull_request` (synchronize) | `refs/pull/<n>/merge` |

With `group: ${{ github.workflow }}-${{ github.ref }}` the two runs land in **different groups**, never cancel each other, and both run to completion. The fix is not a cleverer concurrency key — it is scoping the trigger:

```yaml
on:
  push:
    branches: [ main ]        # post-merge back-stop only
  pull_request:               # PR feedback: `synchronize` fires on every push to the PR head
```

PR feedback still arrives on every push to an **open PR** and tests the merge ref (`refs/pull/<n>/merge` = branch merged into base), which is more correct than testing the branch tip alone. Trade-off to state in the report: branches *without* an open PR get no CI under this config — that is usually fine, but confirm the team doesn't rely on pre-PR branch runs (see R1's decision procedure).

When adapting an existing workflow to this shape, change **only** the trigger scoping: preserve any existing `pull_request.types:` list unchanged (the default set `opened, reopened, synchronize` needs no `types:` at all), preserve a `merge_group:` trigger — and **add** one if the repo uses a merge queue (see R6): the unfiltered `push` you are scoping away may be what currently runs the queue's `gh-readonly-queue/*` branches.

## Phase 0 — Environment

Bail out early if there is nothing to audit: no files under `.github/workflows/` → report "no GitHub Actions workflows found — this skill covers GitHub Actions only" and stop (do not audit `.gitlab-ci.yml` or other CI systems with these rules).

Determine whether live evidence is possible: `gh auth status` succeeds **and** the remote is GitHub (`git remote get-url origin`). If not (GitLab/offline/unauthenticated), run the audit **static-only**, mark every finding "static evidence only" in the report, and treat R6 as UNKNOWN (see R6). Default branch without gh: `git symbolic-ref --short refs/remotes/origin/HEAD` minus the `origin/` prefix — errors on clones where origin/HEAD is unset, then ask the user.

## Phase 1 — Inventory

Build a complete picture before judging anything:

```bash
ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null
gh repo view --json defaultBranchRef --jq .defaultBranchRef.name   # gh available only
```

For every workflow, Read it and record: triggers (with `branches:`/`tags:`/`paths:` filters and `pull_request` `types:`), `merge_group` and `pull_request_target` usage, `concurrency` block, job list, `strategy.matrix` dimensions, reusable-workflow calls (`uses:` at job level), and job-level `if:` guards. **Count jobs after matrix expansion** — a 3-OS × 4-version matrix is 12 jobs, not 1. Follow `workflow_call` chains: a caller inherits every job of the callee.

Also record per workflow whether its steps **depend on push context**: `git push`/`git commit` back to the branch, deploy/publish steps, or `github.ref_name`/`github.ref` used as a value (e.g. preview-deploy slugs). These workflows cannot simply be moved to `pull_request` (the merge-ref checkout is detached) — relevant for R1.

## Phase 2 — Live evidence (only if Phase 0 confirmed gh)

Static reading tells you what *could* run; live data tells you what *does*. Pick the most recently updated open PR (`gh pr list --limit 1 --search 'sort:updated-desc' --json number --jq '.[0].number'`); if the repo has no PRs, skip this phase.

```bash
# Duplicate check names on a PR (same job name twice = double-trigger smell)
gh pr checks <pr> | awk -F'\t' '{print $1}' | sort | uniq -c | sort -rn | head

# Check count per status (pass/fail/skipping) — "skipping" lines cost 0 minutes
gh pr checks <pr> | awk -F'\t' '{print $2}' | sort | uniq -c

# Which event triggered which run, and when?
gh run list --limit 20 --json event,workflowName,headBranch,createdAt \
  --jq '.[] | [.createdAt, .event, .workflowName, .headBranch] | @tsv'
```

If the same workflow appears with both `push` and `pull_request` events for the same branch/PR at near-identical timestamps, the double-trigger is confirmed live — cite this in the report.

## Phase 3 — Checks

Classify every finding with a rule ID, severity, and `file:line` evidence.

### R1 · Double-trigger `push` + `pull_request` — **High**

Workflow has `pull_request` **and** a `push` trigger that fires on PR source branches: no `branches:`/`tags:` filter at all, `branches: ['**']`, or globs that match actual PR head branches. Every PR push runs the workflow twice.

Decision procedure and exclusions:

- A `push` trigger with **only a `tags:` filter** never fires on PR-branch pushes — **not a finding**. Never add `branches:` to a tag-triggered push (branch and tag filters are OR-ed; you would make a release workflow run on every push to main).
- `pull_request_target` is **out of scope for trigger rewrites** — never convert it to/from `pull_request` (it runs base-repo secrets against fork code; the distinction is security-relevant). Report only.
- Ambiguous globs (`branches: [main, 'release/**']`): compare against real PR head branches — `gh pr list --state all --limit 50 --json headRefName --jq '.[].headRefName'`. Overlap confirmed → finding; no data → report as "possible", ask before fixing.
- Workflow depends on push context (Phase 1) or the team relies on pre-PR branch CI → **report-only**; confirm intent via AskUserQuestion before touching the trigger.

**Fix:** scope `push.branches` to the default branch (+ long-lived release branches if used). Keep `pull_request` as the PR trigger, preserving its existing `types:`.

### R2 · Missing or miswired `concurrency` — **Medium**

- No `concurrency` block on a PR-triggered build/test workflow → rapid pushes stack runs. Add:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != format('refs/heads/{0}', github.event.repository.default_branch) }}
```

- `cancel-in-progress: true` unconditionally → also cancels default-branch back-stop runs; those should complete.
- **Never enable cancellation** (even conditionally) on workflows that deploy, publish, or push commits — killing those mid-run means half-applied releases. For them, only ever `cancel-in-progress: false` (pure queueing).
- On `schedule`-triggered workflows `github.event.repository` is absent, so the expression above misfires — use a plain `cancel-in-progress: false` or a `github.event_name`-based condition there.

Note in the report: concurrency is **stacking protection within one event type**, not a dedupe mechanism across `push`/`pull_request` (see refs table above). Never present it as an alternative to the R1 fix.

### R3 · Job budget — **Medium** (default threshold: > 20 jobs per PR push; adjust if the user names a budget, and state the threshold used in the report)

Sum all jobs a single PR push spawns across all `pull_request`-triggered workflows, **after** matrix expansion and `workflow_call` resolution, ×2 for any workflow flagged by R1. Over budget → list the biggest contributors (usually a matrix) and ask whether every cell is needed on PRs (common split: full matrix on default branch / nightly, reduced matrix on PRs). If the repo uses a merge queue, note that each queue entry spawns another full run of every `merge_group` workflow.

### R4 · Noisy `pull_request` triggers — **Medium**

- Extra activity types that re-run full CI on non-code events: `types: [..., labeled, edited, assigned]` re-triggers the whole suite on every label or title edit. Flag unless a job actually reads the label/edit.
- No draft handling: if the team uses draft PRs, `if: ${{ !github.event.pull_request.draft }}` on expensive jobs is one of the biggest real-world PR-minute savers. It needs the **full** types list `types: [opened, synchronize, reopened, ready_for_review]` — writing `types:` replaces the default set, so `types: [ready_for_review]` alone would kill CI on pushes entirely. Suggest it; don't impose it.

### R5 · Redundant per-job event guards — **Info**

Guards like `if: github.event_name == 'pull_request' || github.ref == 'refs/heads/main'` are usually workarounds for a mis-scoped trigger. After the R1 fix they are dead weight — flag for cleanup, but only *after* the trigger fix is applied, and only when the guard is truly implied by the new trigger set.

### R6 · Merge-gate safety — **gate, not a finding** (blocks any trigger change; excluded from finding counts)

Before proposing *any* trigger change, verify the required status checks still get produced by the remaining triggers:

```bash
gh api --paginate repos/{owner}/{repo}/rulesets --jq '.[].id' | while read id; do
  gh api repos/{owner}/{repo}/rulesets/$id \
    --jq '.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context'
done
# Only active rulesets targeting the default branch matter — check `enforcement` and `conditions` when in doubt.
# Legacy branch protection (admin-only endpoint):
DEFAULT=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)
gh api repos/{owner}/{repo}/branches/$DEFAULT/protection/required_status_checks --jq '.contexts[]'
```

Interpretation rules:

- Distinguish error codes: **404** from the branch-protection endpoint just means "no classic branch protection" (normal on rulesets-only repos) — a legitimate empty result, combine with the ruleset output. **401/403/network errors** on either endpoint → required checks are **UNKNOWN**, not "none". Then stop and ask the user to confirm them via *Settings → Rules / Branch protection*; never treat a permission error as "no required checks".
- Every required context must map to a job that a `pull_request` run produces **after** the fix — and, if the repo uses a **merge queue**, also by a `merge_group` run (check for a `merge_queue` rule in the rulesets; preserve/add `merge_group:` triggers on workflows producing required checks, or the queue stalls with checks that never report).
- Contexts not produced by any workflow in the repo belong to external apps (SonarCloud, CLA bots, …) — out of scope, ignore.
- If a required check was only ever produced by the `push` run you are about to scope away → the fix would block all merges; resolve first (usually: point the ruleset at the rollup job, see R7).

### R7 · `paths:` filter on a workflow that produces a required check — **High**

If a workflow with required checks has workflow-level `paths:`/`paths-ignore:`, PRs not touching those paths never start the workflow → the required check stays **pending forever** and blocks the merge. Fix pattern: drop the workflow-level `paths:` filter; do the filtering with a change-detection job + job-level `if:`, and gate the merge on a single rollup job:

```yaml
ci:                                # the one required check
  needs: [lint, test, build]
  if: ${{ !cancelled() }}          # not always(): the rollup itself must stay cancellable
  runs-on: ubuntu-latest
  steps:
    - run: |
        [[ "${{ contains(needs.*.result, 'failure') }}" == "false" && \
           "${{ contains(needs.*.result, 'cancelled') }}" == "false" ]]
```

A **skipped** `needs` job counts as success here (skipped ≠ failure) — exactly what path-filtered jobs need; `failure` and `cancelled` both fail the gate so a killed run can't merge green. Make **only** `ci` required, never the individual jobs.

Conversely: `paths:`/`paths-ignore:` on workflows that are **not** required checks is a legitimate, recommended optimization (docs-only PRs skipping test suites) — don't flag it, and propose it where it saves obvious minutes.

### R8 · Skipped jobs are NOT findings

Conditional jobs (`if: needs.detect-changes.outputs...`) show as "skipping" lines on the PR but cost **0 minutes** — that is monorepo path-filtering working as intended. Do not flag them; do not count them toward R3. State explicitly in the report: *number of check lines ≠ number of running jobs*.

### R9 · Efficiency quick wins — **Info** (report, don't push)

Only mention when clearly applicable, one line each: missing dependency caching (`setup-node`/`setup-java`/... `cache:` input), missing `timeout-minutes` on long jobs (default is 360!), `fail-fast` tuning on matrices, `fetch-depth: 0` without a reason (full-clone cost), high-frequency `schedule` crons or crons duplicated across workflows.

## Phase 4 — Report

One table, sorted by severity, then a savings estimate:

| Rule | Severity | Workflow | Finding | Fix |
|---|---|---|---|---|

Estimate savings concretely: "R1 on `build.yml` (14 jobs after matrix): every PR push currently spawns ~28 jobs; the fix halves that." End with: `N workflows · K findings (H high / M medium / L info)`. R6 is a gate, not a finding — report its status (verified / UNKNOWN) separately, outside the counts.

If this is an audit-only request, **stop here** and offer the fix as a follow-up.

## Phase 5 — Fix (after user confirmation, R6 verified first)

1. Re-check R6 against the concrete edit you are about to make. If R6 is UNKNOWN, do not touch triggers.
2. Apply trigger scoping (R1) and concurrency blocks (R2) via Edit — smallest diff that fixes the finding; do not reformat surrounding YAML; never rename jobs (required-check contexts match on names).
3. R7 conversions are **sequenced**, because the ruleset must be repointed — in this order, so no intermediate state re-creates the pending-forever trap:
   - **(a) One workflow PR**: add the rollup job **and** remove the workflow-level `paths:` filter **and** add the change-detection job-level `if:`s, together. This PR merges under the old ruleset: the old individual contexts are still produced (path-skipped jobs report `skipped`, which satisfies required checks).
   - **(b) One ruleset edit** after (a) is merged: replace the old individual required contexts with the single `ci` rollup context — delegate to the sibling **`branch-ruleset-setup`** skill or hand it to the user (admin rights).
   - Never do the ruleset repoint *before* the workflow change lands: a ruleset requiring `ci` while the workflow still carries the `paths:` filter blocks every PR outside those paths — potentially including the fix PR itself.
4. Only then remove guards made redundant (R5).
5. Validate statically:

```bash
actionlint   # auto-discovers .github/workflows (.yml and .yaml); brew install actionlint — if unavailable, say so and skip
```

6. Tell the user how to verify after merge: open/update a PR and re-run the Phase 2 duplicate-check command — duplicate job names should be gone and the check count should drop to the Phase 4 estimate.

## Guardrails (pointers — the full rules live in the sections named)

- The R6 gate is absolute: UNKNOWN = no trigger edits. A broken merge gate is worse than duplicate runs.
- R1 exclusions are hard lines: tag-only `push` triggers and `pull_request_target` are never rewritten.
- R2: cancellation is never enabled on deploy/publish/commit-pushing workflows.
- R7: `paths:` filters never go on required-check workflows; on non-required ones they're a recommended saving.
- The `push: branches: [main]` back-stop stays: merge-ref ≠ post-merge reality (e.g. semantic conflicts between concurrently merged PRs) — never trade it for further minutes.

## Sources

- Events that trigger workflows (`push`, `pull_request` types, `merge_group`): https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- Contexts (`github.ref` per event, `needs.<job>.result` values): https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- Workflow syntax (`concurrency`, `paths` + required-check pending note, `timeout-minutes` default 360): https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Troubleshooting required status checks (skipped-but-required trap): https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks
- actionlint: https://github.com/rhysd/actionlint
