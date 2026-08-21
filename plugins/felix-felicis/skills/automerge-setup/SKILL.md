---
name: automerge-setup
description: "Sets up, audits, or optimizes GitHub PR auto-merge — the single source of truth for the auto-merge workflow, its safety preconditions (native 'Allow auto-merge' setting + a required-status-check ruleset), and its scope gate. Grades the CI signal (what a green check actually proves — lint vs build vs unit vs integration/E2E, weighed against what the repo ships) and caps the scope recommendation to it. Covers Dependabot (fetch-metadata, patch/minor auto), Renovate (native platformAutomerge), and generic bot PRs (actor + label). Use when asked to set up, audit, fix, or optimize auto-merge / automerge / merge Dependabot or Renovate PRs automatically."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, AskUserQuestion
---

# Skill: automerge-setup

The one place that owns GitHub PR auto-merge. Detects what's already there, audits it against best practice, and either optimizes it or creates it — working **collaboratively**: gather evidence first, present findings and a recommendation, let the user decide via AskUserQuestion, then write. Never overwrite an existing workflow without showing what's wrong with it.

Run this when asked to "set up auto-merge", audit/optimize an existing auto-merge workflow, or auto-merge Dependabot/Renovate PRs. Sibling skills own the neighbouring concerns and this skill delegates to them: **`branch-ruleset-setup`** (the required-status-check precondition), **`pin-github-actions`** (SHA-pinning the workflow's actions), **`dependabot-setup`** (the update config itself), **`dependency-update-shepherd`** (arming auto-merge on already-open PRs at runtime, one at a time).

GitHub-only — the mechanism is GitHub's native auto-merge (`gh pr merge --auto` + the repo's *Allow auto-merge* setting). Precondition: `gh auth status` authenticated with **admin** rights on the target repo (needed to read/set the repo setting and rulesets).

## The three strategies

The gate that decides *which* PRs auto-merge follows from what opens them. Default recommendation = Dependabot. Templates ship in `reference/` next to this SKILL.md.

| Strategy | Gate | semver-aware? | Template |
|---|---|---|---|
| **Dependabot** *(default)* | `github.actor == 'dependabot[bot]'` + `dependabot/fetch-metadata` update-type | **yes** — patch/minor auto, majors stay manual | `reference/dependabot-automerge-workflow.yml` |
| **Renovate** | Renovate-native `automerge` + `platformAutomerge` in the Renovate config — **no workflow** | yes (Renovate's own `matchUpdateTypes`) | (config, not a template file) |
| **Generic (actor + label)** | trusted `github.actor` **and** an eligibility label | **no** — scope must come from the label | `reference/generic-automerge-workflow.yml` |

For **Renovate**, prefer its native path over a workflow: set `automerge: true` (optionally scoped, e.g. `matchUpdateTypes: ['patch','minor']`) plus `platformAutomerge: true` in `renovate.json`/`.renovaterc*`. That drives GitHub's native auto-merge directly — no second workflow to maintain, and Renovate has no `fetch-metadata` equivalent for a workflow to reuse.

For the **generic** strategy, be explicit that without `fetch-metadata` the workflow **cannot tell a patch from a major**. Never auto-merge every PR from an actor blind — gate on an eligibility label so whoever applies it (a human, or the bot's own labeller) keeps majors out.

## Phase 0 — Detect

**a) Update bot.** `.github/dependabot.yml` → Dependabot · `renovate.json*` / `.renovaterc*` (or a `renovate`/`renovate-bot` config in `package.json`) → Renovate · neither → generic/other bot.

**b) Existing auto-merge, all forms:**

```bash
# Workflow-based
ls .github/workflows/ 2>/dev/null
grep -rl "gh pr merge --auto\|enablePullRequestAutoMerge\|--auto-merge\|auto_merge" .github/workflows/ 2>/dev/null
# Native repo setting (must be on for `--auto` to work at all)
gh api repos/{owner}/{repo} --jq '{allow_auto_merge, allow_squash_merge, delete_branch_on_merge}'
# Renovate-native
grep -rn "automerge\|platformAutomerge" renovate.json* .renovaterc* .github/renovate.json* 2>/dev/null
```

**c) CI signal — enumerate, don't just count.** List the checks that actually run on a PR and read what each *does*, because Phase 1b grades their strength. Don't stop at "a test job exists".

```bash
# Static: which workflows trigger on PRs (then read their job steps)
grep -rl "pull_request" .github/workflows/ 2>/dev/null
# Live (best signal): the checks a recent PR actually reported
gh pr checks <recent-PR-number> 2>/dev/null   # or, for the default branch head:
gh api repos/{owner}/{repo}/commits/{sha}/check-runs --jq '.check_runs[].name'
```

Classify what a green run proves — formatting/lint only, build/type-check, unit tests, or integration/E2E. Auto-merge without any real check merges blind; auto-merge behind a check that only lints merges nearly as blind.

## Phase 1 — Safety preconditions (a gate, not a finding)

Auto-merge is only safe — and only *works* — when all three hold. Treat them as a gate: do not write a merge workflow while any is open; name what's missing and offer to fix it (delegating), then stop.

1. **Native `allow_auto_merge` enabled.** Without it, `gh pr merge --auto` fails outright. Enable via `gh api -X PATCH repos/{owner}/{repo} -f allow_auto_merge=true` (confirm with the user first).
2. **A required-status-check ruleset gates the default branch.** Without a required check, `--auto` merges *the moment merge requirements are met* — i.e. immediately — so CI never gates and a broken bump lands unreviewed. Delegate to **`branch-ruleset-setup`**.
3. **A CI test job actually runs on PRs** (Phase 0c). A required check that runs nothing is not a gate. This is the *presence* gate only — whether the check is a *meaningful* gate is graded next (Phase 1b) and drives the scope recommendation.

If a precondition is unmet, state it plainly, offer to set it up via the sibling skill, and stop — do **not** write the workflow.

## Phase 1b — Grade the CI signal (scope-aware)

The presence gate (Phase 1.3) only asks *"does a check run"*. This phase asks the question that actually governs **how much** to auto-merge: *what does a green check prove for this repo?* A dependency bump is only as safe as the CI guarding it, so the Phase 3 scope recommendation follows from this grade — not from repo type alone.

**Signal tiers** — read the PR workflows' steps (Phase 0c) and grade the *strongest* check that runs:

| Tier | What runs | What green proves | Scope ceiling it justifies |
|---|---|---|---|
| **S0** | nothing, or format/lint only | style only — nothing about runtime | **no auto-merge at any scope** |
| **S1** | build / compile / type-check | it still builds; catches API-breaking majors, not behaviour | **patch only** |
| **S2** | unit tests | behaviour of covered units holds | **patch + minor** |
| **S3** | integration / E2E (real deps, wired components) | cross-component behaviour holds | **patch + minor, confidently** |

**Then weigh the repo's scope** — the tier sets the ceiling; blast radius can *lower* the recommendation but never raise it above what CI proves:

- **What it ships & to whom** — a library others consume or a service deployed to prod raises the bar (a bad bump escapes the repo); an internal tool or dev-only dependency lowers it.
- **Where the risk lives vs. where the tests are** — a web/UI app whose only tests are unit-level has an *untested* integration surface exactly where a runtime bump breaks. That argues for S3 before minors auto-merge: recommend adding integration/E2E (out of this skill's scope — the repo's test tooling owns it), or hold at patch-only until it exists.
- **Dev vs. runtime dependencies** — `devDependencies` (build tools, linters) are guarded well by S1/S2; runtime deps that ship to users need behavioural coverage (S2/S3) before their minors auto-merge.

State the grade plainly with evidence (e.g. *"CI runs `build` + `eslint` only → S1; no test executes a line of shipped code"*) and carry it into Phase 3 as the basis for the scope recommendation.

## Phase 2 — Audit the existing setup (if present)

Check the workflow (or Renovate config) against best practice; report each gap with file:line evidence. This is also where **drift** surfaces — a workflow generated from an older template that no longer matches:

- [ ] **Least-privilege permissions** — exactly `contents: write` + `pull-requests: write`, not a broad `write-all` or the default token scope.
- [ ] **Actor gate** — restricted to the trusted bot(s); no unscoped auto-merge of arbitrary PRs.
- [ ] **Update-type gate (Dependabot)** — patch/minor only via `fetch-metadata`; **majors must stay manual**. A workflow that merges all update types is a finding.
- [ ] **SHA-pinned actions** — `dependabot/fetch-metadata` (and any other `uses:`) pinned to a full 40-char commit SHA + version comment → delegate **`pin-github-actions`**.
- [ ] **Merge-race retry loop** — `on: pull_request` fires while the required check is still queued and the merge state is UNSTABLE, so a single-shot `gh pr merge --auto` exits 1 and auto-merge never queues. The template retries (5 attempts, 15s backoff). **A single-shot `gh pr merge --auto` with no loop is the canonical drift finding** — flag it.
- [ ] **Merge method coherence** — `--squash` matches a linear-history ruleset; if the ruleset forbids merge commits, an unqualified merge fails. Align the flag with the ruleset's `allowed_merge_methods`.
- [ ] **Precondition coherence** — native setting on and a required check present (Phase 1); a workflow with neither is theater.

## Phase 3 — Recommend & decide

Post the findings **as a normal message first** — the Phase 1 gate status, the **Phase 1b CI-signal grade**, and the Phase 2 audit table — then confirm via **AskUserQuestion**, recommendation first and marked "(recommended)", every option stating its consequence. Ask only what the evidence can't answer:

1. **Strategy** — **Dependabot** *(recommended when Dependabot is detected)* / **Renovate-native** *(recommended when Renovate is detected — configure `automerge`+`platformAutomerge`, no workflow)* / **generic actor+label** (only for other bots; state the no-semver-awareness caveat).
2. **Scope — capped by the Phase 1b grade, not chosen freely.** Recommend the *widest scope the CI signal justifies* and say why in the option text: S3/S2 → **patch + minor** *(recommended)*; S1 → **patch only** *(recommended)*; S0 → **don't auto-merge — strengthen CI first** *(recommended)*. Offer wider scopes as explicit options but label their risk (e.g. *"minor bumps merge on a build-only check — a runtime regression lands unseen"*). **Majors always stay manual.**
3. **Enable the native `allow_auto_merge` setting** *(recommended yes)* if Phase 1 found it off.
4. **If the grade is below what the repo's scope wants** (e.g. an S1 UI app), offer a **strengthen-CI-first** path as its own option: hold auto-merge at the safe scope now, and name that adding integration/E2E is the real unlock (that work is out of this skill's scope — the repo's test tooling owns it).

The scope recommendation is **driven by the Phase 1b grade first, repo type second**: a green check that only builds cannot justify auto-merging minors no matter how internal the repo is. *Within* a grade, then lean by repo type — *enable* for internal / low-noise repos (CI is the gate, review capacity is the constraint), lean *against* auto-enabling for OSS / product repos where a maintainer may want eyes on every bump. If the Phase 1 preconditions aren't met, the honest recommendation is to set those up first and revisit.

## Phase 4 — Create or optimize

Enter only once the Phase 1 gate is resolved (preconditions met, or the user explicitly accepts an unsafe setup and you've said so).

- **Update > replace.** Fix the specific gaps found in Phase 2; carry over deliberate customizations (extra actor gates, ecosystem/label narrowing) verbatim.
- **Dependabot / generic:** copy the matching `reference/*.yml` to `.github/workflows/`, **stripping the teaching comments** (keep at most a one-line label, in the repo's comment style — never emit the rationale prose). Re-resolve the `fetch-metadata` SHA to the intended release rather than copying the template's verbatim:
  ```bash
  gh api repos/dependabot/fetch-metadata/git/refs/tags/<tag> --jq .object.sha
  ```
  **Keep the retry loop** (don't collapse it back to one line) and set `--squash` to match the ruleset.
- **Renovate:** edit the Renovate config instead — `automerge: true` (scoped via `matchUpdateTypes` to hold majors out) + `platformAutomerge: true`. Don't write a workflow.
- **Native setting:** if off and the user opted in, `gh api -X PATCH repos/{owner}/{repo} -f allow_auto_merge=true`.
- **Delegate the neighbours:** required-check ruleset → **`branch-ruleset-setup`**; action SHA-pins → **`pin-github-actions`**; missing Dependabot/Renovate config → **`dependabot-setup`**.

## Phase 5 — Verify

- Workflow YAML parses: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/<file>.yml'))"` (fall back to `npx --yes yaml` or careful review).
- `fetch-metadata` (and every `uses:`) is SHA-pinned.
- Native setting is on: `gh api repos/{owner}/{repo} --jq .allow_auto_merge` → `true`.
- **Remind the user auto-merge does nothing until the required-status-check ruleset is in place** (**`branch-ruleset-setup`**) — the workflow only expresses intent; the required check is the actual gate.
- Mention GitHub's native **merge queue** as an alternative/complement for high-traffic default branches (serializes and re-tests merges), out of this skill's default scope.

## Sources

- Automating Dependabot with Actions (fetch-metadata, auto-merge): https://docs.github.com/en/code-security/dependabot/working-with-dependabot/automating-dependabot-with-github-actions
- `gh pr merge --auto` / native auto-merge: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request
- Enabling the repo *Allow auto-merge* setting: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/managing-auto-merge-for-pull-requests-in-your-repository
- Renovate `automerge` / `platformAutomerge`: https://docs.renovatebot.com/configuration-options/#automerge
- Repository rulesets (required status checks): https://docs.github.com/en/rest/repos/rules
