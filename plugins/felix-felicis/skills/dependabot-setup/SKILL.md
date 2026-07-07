---
name: dependabot-setup
description: "Audits and sets up .github/dependabot.yml: recommends a grouping mode (low-noise, balanced, fine-grained) from the repo's use-case, gates setup on pinned dependency versions, wires CODEOWNERS over the deprecated reviewers key, groups security updates. Use when asked to set up, review, fix, or audit Dependabot / automated dependency updates / dependency grouping."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, AskUserQuestion
---

# Skill: dependabot-setup

Analyzes `.github/dependabot.yml` — creating it if missing, repairing it if it deviates — and works **collaboratively**: gather evidence first, present findings and a recommended mode with reasons, let the user decide via AskUserQuestion, then write. Never overwrite an existing config without showing what's wrong with it. Pinned versions are the entry ticket: a Dependabot config over floating versions is theater, so the pin gate (Phase 3, delegating to the **`pin-node-dependencies`** / **`pin-github-actions`** siblings) must resolve before anything is written.

Run this when asked to "set up dependabot", review an existing config, or as the dependency-automation slice of a supply-chain audit (sibling skill **`release-audit`**).

## The three modes

The core decision is **how much review attention dependency PRs deserve**. Ready-to-adapt templates ship in `reference/` next to this SKILL.md.

| Mode | Grouping | Cadence | Right for | Template |
|---|---|---|---|---|
| **low-noise** | Everything (patch+minor+major) in one PR per ecosystem; optionally ONE repo-wide PR via multi-ecosystem groups | monthly | Solution templates, examples, internal tooling — minimal review capacity, CI is the gate | `mode-low-noise.yml`, `mode-low-noise-single-pr.yml` |
| **balanced** *(default)* | minor+patch grouped per ecosystem; **each major = own PR** | weekly | Open-source projects, production code, anything with external users — breaking changes get individual review | `mode-balanced.yml` |
| **fine-grained** | balanced + family groups (framework / testing / linting / …) + monorepo consolidation | weekly | Large dependency trees (≈40+ direct deps in one ecosystem), grouped PRs that repeatedly conflict or fail CI, monorepos | `mode-fine-grained.yml` |

Within low-noise, **one PR per ecosystem is the default**: a single-tech repo is simply one fully-grouped block, and unrelated stacks (npm frontend + gradle backend) stay in separate PRs so a broken gradle major never blocks frontend updates. The repo-wide single PR is the escalation for when even one PR per ecosystem is too many — never for unrelated stacks.

The mode may differ per ecosystem: even in balanced mode, `github-actions` is commonly fully grouped (majors are mostly mechanical when actions are SHA-pinned and CI gates); keep actions majors separate only when workflows are the release pipeline.

**Stack-groups variant** (`mode-stack-groups.yml`) — multi-ecosystem groups also work *selectively*, orthogonal to the mode: ecosystems that move together share one PR per stack (backend manifest + the docker/compose images it runs on; backend & client released in lockstep; terraform + infra images) while everything else keeps its normal blocks. Propose it when Phase 1 finds coupled manifests — e.g. a compose file whose service images match the backend's drivers. Trade-offs to state: the stack shares one CI gate, and majors ride along with everything the patterns match — ecosystems whose majors need individual review stay outside the stack in a balanced block (mixing is fine).

## Phase 1 — Discover

**a) Ecosystems.** Find every manifest Dependabot can watch, including nested ones (each distinct directory needs its own `directory`, or one block with a `directories` glob list):

| Manifest found | `package-ecosystem` |
|---|---|
| `package.json` | `npm` (also covers pnpm/yarn) / `bun` |
| `.github/workflows/*.yml`, `action.yml` | `github-actions` |
| `Dockerfile*` / `docker-compose*.yml` / charts | `docker` / `docker-compose` / `helm` |
| `pom.xml` / `build.gradle(.kts)` | `maven` / `gradle` |
| `requirements*.txt`, `pyproject.toml` | `pip` / `uv` |
| `go.mod` / `Cargo.toml` / `Gemfile` | `gomod` / `cargo` / `bundler` |
| `*.csproj`, `global.json` | `nuget` / `dotnet-sdk` |
| `*.tf` / `devcontainer.json` / `.pre-commit-config.yaml` | `terraform` / `devcontainers` / `pre-commit` |

```bash
find . -path ./node_modules -prune -o \( -name package.json -o -name 'Dockerfile*' -o -name pom.xml \
  -o -name 'build.gradle*' -o -name go.mod -o -name Cargo.toml -o -name '*.tf' -o -name pyproject.toml \) -print
ls .github/workflows/ 2>/dev/null
```

Full ecosystem list: the [options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).

**b) Repo identity — the primary evidence.** The mode follows from what the repo *is* and who it serves — not from how updates were handled so far:

```bash
gh repo view --json isTemplate,isFork,isArchived,visibility,stargazerCount,description,licenseInfo
head -50 README.md                                       # what is this, who consumes it?
gh release list --limit 5 2>/dev/null                    # does it actually publish?
ls .github/workflows/                                    # is there a CI test job that gates PRs?
jq '(.dependencies//{}|length) + (.devDependencies//{}|length)' package.json 2>/dev/null   # dep count per ecosystem
```

Answer these explicitly before recommending anything:
- **Purpose** — product people depend on, library/package others consume, solution template, example/demo, internal tooling?
- **Audience** — open-source with external users, or closed/internal where the team is the only consumer?
- **What it ships** — how many artifacts does it deploy or publish (npm packages, container images, marketplace extensions)? Every published artifact raises the cost of a silently-broken major.
- **Safety net** — CI tests that actually gate merges; release automation.
- **Scale & shape** — dep count per ecosystem, number of packages/workspaces, coupled stacks (compose file + backend manifest).

**c) Update history — calibration only, never the basis.** The existing config and past habits may be exactly what needs to change; deriving the target from the status quo would just ratify it. Use history to *tune within* the recommended mode:

```bash
gh pr list --author 'app/dependabot' --state all --limit 100 --json state,createdAt,closedAt,mergedAt,title
```

- **Many closed-without-merge / PRs open 30+ days** → noise exceeded capacity → slower cadence or higher cooldown inside the chosen mode.
- **Grouped PRs repeatedly superseded, conflicting, or red** → groups too broad → corroborates fine-grained.
- **Patches merge fast, majors rot** → raise `semver-major-days` cooldown, don't change mode.

## Phase 2 — Analyze the existing config (if present)

Check each update block:

- [ ] **Coverage** — a block (or `directories` entry) for every ecosystem/directory from Phase 1; no orphan blocks for manifests that no longer exist.
- [ ] **Mode coherence** — which mode does the config resemble, and is it consistent across blocks? A "balanced" repo with one all-types group hides breaking majors inside routine PRs — finding.
- [ ] **Dead & deprecated config:**
  - `reviewers:` — **removed by GitHub (Aug 2025)**, silently ignored → delete, wire `CODEOWNERS` instead.
  - `target-branch:` — a block with `target-branch` **no longer applies to security updates**, even when it names the default branch. Flag redundant `target-branch: main` for removal.
  - Duplicate blocks (same ecosystem + directory), overlapping `directory`/`directories` definitions.
- [ ] **Reviewer wiring** — for a repo owned by a small group, prefer one `CODEOWNERS` `*` rule over per-block `assignees`: it covers all PRs (not just Dependabot's) and doesn't rot in N places. Keep `assignees` only where a dedicated person triages dependency PRs *separately* from code ownership (larger orgs).
- [ ] **Groups correct:**
  - Group **order matters** — first match wins; specific families must precede the catch-all.
  - A group only affects version updates unless it says otherwise: without an `applies-to: security-updates` group, **every CVE opens its own PR**.
- [ ] **Noise controls** — `cooldown` present (supply-chain guard: new releases mature before a PR opens); `open-pull-requests-limit` sized to the expected PR count (default 5 — too low for balanced mode where majors arrive individually).
- [ ] **Clutter** — labels that don't exist in the repo or are typo'd (`gh label list`; e.g. "Technical Dept"), `schedule.time` without `timezone` (runs UTC), restated defaults, `versioning-strategy` that fights an exact-pin policy (`widen` vs pinned versions).

## Phase 3 — Precondition: versions must be pinned

Dependabot PRs only reflect reality when manifests state exact versions — on floating specs the resolved dependency drifts on every install and the whole setup is theater. **Treat pinning as a gate, not a finding**: do not write a config while versions float.

Check per ecosystem, report with file:line evidence:

- **npm** — no `^`/`~`/`>=`/`*`/`latest`/mutable git refs; lockfile committed → fix via sibling skill **`pin-node-dependencies`**
- **github-actions** — every `uses:` pinned to a full 40-char commit SHA → fix via sibling skill **`pin-github-actions`**
- **docker / docker-compose** — exact tag, ideally tag + `@sha256:` digest, never `latest`
- **maven / gradle** — no dynamic versions (`1.+`, `[1.0,)`, `latest.release`)
- **pip** — `==` pins or a committed lockfile (uv / poetry / pip-tools)

If anything floats, resolve the gate **before Phase 5** via AskUserQuestion: **fix pins now** (recommended — invoke the sibling skills for npm and actions, patch the other ecosystems directly) or **proceed anyway**, with the user explicitly accepting that Dependabot PRs for the floating ecosystems won't match what actually runs. Record the choice in the Phase 4 report.

## Phase 4 — Report, recommend, decide

Post the findings **as a normal message first** — table of Phase 2/3 checks plus the mode recommendation. The recommendation derives from the repo's **use-case (Phase 1b)**; update history (Phase 1c) only tunes cadence, cooldown, and group breadth within it. If the recommendation contradicts the current setup, say so and explain the delta — matching the status quo is not a goal:

| Use-case | Recommend |
|---|---|
| Solution template, example/demo, internal tooling with no external consumers | low-noise |
| Open-source project or product with external users; publishes artifacts — the more it deploys, the stronger the case | balanced |
| Large dependency tree (≈40+ direct deps in one ecosystem), many packages/workspaces, monorepo with shared deps | fine-grained |
| Coupled stacks (backend manifest + the compose/docker images it runs on; backend & client in lockstep) | stack-groups variant on top |
| **No CI test job** | never low-noise — grouped majors would merge blind; recommend balanced and adding CI |

Then confirm via **AskUserQuestion** — recommendation first, marked "(recommended)", every option stating its consequence. Ask only what the evidence can't answer, max 4 questions:

1. **Mode** — the three modes with one-line trade-offs; include the single-PR multi-ecosystem variant as an option only for clear low-noise repos, and the stack-groups variant as an option when Phase 1 found coupled ecosystems (name the concrete stacks, e.g. "gradle + docker-compose as one backend PR").
2. **Cadence** — weekly vs monthly, only if PR history and repo type point in different directions.
3. **Review wiring** — CODEOWNERS-only (recommended for small teams) vs keep `assignees`, only if the existing config has assignees/reviewers.
4. **Existing customizations** (multiSelect) — which `ignore:` rules, labels, or schedule quirks to carry over vs drop.

## Phase 5 — Create or update

Enter this phase only once the Phase 3 pin gate is resolved — pins fixed (sibling skills run, other ecosystems patched) or floating versions explicitly accepted by the user.

- **Update > replace.** Fix the specific gaps; carry over confirmed customizations (especially `ignore:` rules) verbatim, including comments.
- Start from the chosen `reference/mode-*.yml`, one block per detected ecosystem/directory. For fine-grained: derive family groups from the *actual* manifests, never ship template families the repo doesn't use, and confirm the families with the user.
- Every mode keeps: `labels: ['dependencies']`, `commit-message` prefix `chore` + `include: scope`, `cooldown`, and an `applies-to: security-updates` group per ecosystem.
- If no `CODEOWNERS` exists, create `.github/CODEOWNERS` with a default owner (suggest from `gh api repos/{owner}/{repo} --jq .owner.login`):

  ```
  # Default owners — requested as reviewers on every PR, including Dependabot's
  * @<owner-or-team>
  ```

- Ensure referenced labels exist: `gh label create dependencies --description "Dependency updates" --color 0366d6` for any missing one.

## Phase 6 — Verify

- YAML parses: `python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"` (fall back to `npx --yes yaml` or careful review).
- `CODEOWNERS` check after pushing: `gh api repos/{owner}/{repo}/codeowners/errors`.
- Config errors and run logs surface under **Insights → Dependency graph → Dependabot** — tell the user to check there after the merge, since GitHub validates unknown keys only at run time.
- Optional follow-up to mention (not to build unasked): with branch protection in place (sibling **`branch-ruleset-setup`**), patch/minor group PRs can be auto-merged via `dependabot/fetch-metadata` + `gh pr merge --auto`.

## Sources

- Options reference: https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- Grouped updates / PR optimization: https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/optimizing-pr-creation-version-updates
- Multi-ecosystem groups: https://docs.github.com/en/code-security/dependabot/working-with-dependabot/configuring-multi-ecosystem-updates
- Cross-directory `group-by: dependency-name` (Feb 2026): https://github.blog/changelog/2026-02-24-dependabot-can-group-updates-by-dependency-name-across-multiple-directories/
- `reviewers` removal in favor of CODEOWNERS: https://github.blog/changelog/2025-04-29-dependabot-reviewers-configuration-option-being-replaced-by-code-owners/
- Reference implementations: low-noise — https://github.com/Miragon/miravelo-shop-example/blob/main/.github/dependabot.yml · balanced — https://github.com/Miragon/bpmn-modeler/blob/main/.github/dependabot.yml
