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

| Mode | Grouping | Cadence starting point | Right for | Template |
|---|---|---|---|---|
| **low-noise** | Everything (patch+minor+major) in one PR per ecosystem; optionally ONE repo-wide PR via multi-ecosystem groups | monthly | Solution templates, examples, internal tooling — minimal review capacity, CI is the gate | `mode-low-noise.yml`, `mode-low-noise-single-pr.yml` |
| **balanced** *(default)* | minor+patch grouped per ecosystem; **each major = own PR** | weekly | Open-source projects, production code, anything with external users — breaking changes get individual review | `mode-balanced.yml` |
| **fine-grained** | balanced + family groups (framework / testing / linting / …) + monorepo consolidation | weekly | Large dependency trees (≈40+ direct deps in one ecosystem), grouped PRs that repeatedly conflict or fail CI, monorepos | `mode-fine-grained.yml` |

"Cadence starting point" is the mode's default before per-ecosystem tuning — see **Per-ecosystem cadence** in Phase 1 and the confirmation step in Phase 4. Security updates are never affected by `schedule.interval` (Dependabot opens those the moment a vulnerability is detected regardless of cadence), so the interval only trades off routine-update noise vs. staleness.

Within low-noise, **one PR per ecosystem is the default**: a single-tech repo is simply one fully-grouped block, and unrelated stacks (npm frontend + gradle backend) stay in separate PRs so a broken gradle major never blocks frontend updates. The repo-wide single PR is the escalation for when even one PR per ecosystem is too many — never for unrelated stacks.

The mode may differ per ecosystem: even in balanced mode, `github-actions` is commonly fully grouped (majors are mostly mechanical when actions are SHA-pinned and CI gates); keep actions majors separate only when workflows are the release pipeline.

**Stack-groups variants — width follows repo type.** When Phase 1d finds coupling (dependencies across ecosystems tracking the same underlying software), two widths can bundle it, both orthogonal to the mode. **The choice is driven by *what the repo is* (Phase 1b), not by how many dependencies happen to be coupled:**

- **Wide** (`mode-stack-groups.yml`) — bundle each coupled ecosystem *whole* into one PR per stack (all gradle + all docker/compose as one backend group; backend & client in lockstep; terraform + infra images). Right for **solution templates, examples, internal repos not consumed by other projects**: nobody reviews these PRs individually, CI is the gate, and consolidation beats precision.
- **Narrow** (`mode-fine-grained-stack-groups.yml`) — only the coupled dependency *pair* joins a multi-ecosystem group; the rest of each ecosystem keeps normal per-ecosystem handling. Right for **libraries/OSS consumed elsewhere, or a large dependency tree**, where unrelated majors still deserve individual review. Two blocks per coupled ecosystem, same directory: a "regular" block with the ecosystem's normal groups that `ignore`s the coupled dependency, and a "stack" block scoped via `patterns` to just that dependency, joining the shared `multi-ecosystem-group` — `ignore` only suppresses updates within the block that declares it, so the stack block still gets version and security updates for the coupled dependency.

**Trade-offs to state for *either* width when proposing a stack group:** the stack shares one CI gate; everything the patterns match rides together, majors included; and **a member block that joins a multi-ecosystem group carries only `package-ecosystem`, `directory`, `patterns`, and `multi-ecosystem-group`** — `schedule`/`labels` live on the group, and `cooldown`, `commit-message`, and `groups` cannot sit on members. So every ecosystem pulled into a stack **loses its per-block `cooldown`, `commit-message` prefix, and forced `applies-to: security-updates` grouping**. Keep an ecosystem whose majors (or those knobs) need individual handling out of the stack, in a normal balanced/fine-grained block (mixing is fine).

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
- **Scale & shape** — dep count per ecosystem, number of packages/workspaces. (Cross-ecosystem coupling is its own mandatory step — see **d** below.)

**Per-ecosystem cadence.** The mode sets a starting point, but `schedule.interval` is decided **per ecosystem**, not once for the whole config — different ecosystems in the same repo release at different speeds:

| Ecosystem tendency | Typical starting interval |
|---|---|
| Fast-moving app deps (npm, pip, gradle/maven app libs) in an actively developed repo | weekly |
| Slow-moving / mostly mechanical (github-actions, terraform providers, devcontainers) | monthly |
| Docker base images | weekly — patches land often and cooldown already absorbs the risk of a too-fresh tag |
| Any ecosystem in a low-activity or maintenance-mode repo, regardless of mode | monthly (or slower) — matches actual review bandwidth |

Treat this table as a heuristic to seed the Phase 4 question, not a rule to apply silently — always confirm the actual interval per ecosystem with the user rather than defaulting to the mode's starting point.

**c) Update history — calibration only, never the basis.** The existing config and past habits may be exactly what needs to change; deriving the target from the status quo would just ratify it. Use history to *tune within* the recommended mode:

```bash
gh pr list --author 'app/dependabot' --state all --limit 100 --json state,createdAt,closedAt,mergedAt,title
```

- **Many closed-without-merge / PRs open 30+ days** → noise exceeded capacity → slower cadence or higher cooldown inside the chosen mode.
- **Grouped PRs repeatedly superseded, conflicting, or red** → groups too broad → corroborates fine-grained.
- **Patches merge fast, majors rot** → raise `semver-major-days` cooldown, don't change mode.

**d) Cross-ecosystem coupling — mandatory, explicit.** Coupling is not a judgement call to leave to prose — run it as an explicit step. After collecting the pinned version of every dependency in every ecosystem (you read these anyway for the Phase 3 pin gate), **identify dependencies in different ecosystems that track the same underlying software or release train**, and flag each such pair as a coupled candidate — manifests that must bump together. Two signals surface a pair, don't rely on only the first: an **identical version string** shared across manifests (the strongest and easiest to grep — e.g. one library pinned in two places), *and* **different version strings that nonetheless track one product** — a server and the client library that talks to it version their releases independently, so a literal-value match would miss them; recognise the shared software by name, not by number.

Stay general — flag *any* shared software, not just the familiar shapes. Illustrative pairs only:
- a server image in `docker`/`docker-compose` and its client SDK or driver in `npm`/`gradle`/`pip` — e.g. the `postgres` image (tag `16`) and the `org.postgresql:postgresql` driver (`42.7.x`): different version numbers, same server, must move together
- a backend library and the client's pinned copy of the same library — usually an *identical* version string (backend & client released in lockstep)
- a provider/tool and the deployed image tag it manages — e.g. a terraform provider and the infra image it provisions (typically different numbers)

Every coupled pair becomes a candidate carried into **Phase 4**, where the *width* of the bundle is chosen by repo type. If nothing across ecosystems tracks the same software, record "no coupling found" and skip the stack-group variants.

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
| Coupling found (Phase 1d) **and** the repo is a solution template / example / internal tool not consumed by other projects | **wide** stack groups on top — bundle each coupled ecosystem whole into one PR (`mode-stack-groups`); CI is the gate, consolidation beats precision |
| Coupling found (Phase 1d) **and** the repo is a library/OSS consumed elsewhere, or has a large dependency tree | **narrow** targeted pairing on top — only the coupled pair joins a multi-ecosystem group, the rest of each ecosystem stays per-ecosystem (`mode-fine-grained-stack-groups`) so unrelated majors keep individual review |
| **No CI test job** | never low-noise — grouped majors would merge blind; recommend balanced and adding CI |

Then confirm via **AskUserQuestion** — recommendation first, marked "(recommended)", every option stating its consequence. Ask only what the evidence can't answer, max 4 questions:

1. **Mode** — the three modes with one-line trade-offs. Include the single-PR multi-ecosystem variant only for clear low-noise repos. **Whenever Phase 1d found coupling, surface *both* stack-group widths in the same question** and mark the one matching the Phase-1b use-case "(recommended)":
   - **wide** — whole coupled ecosystems bundled (`mode-stack-groups`), recommended for solution-template/example/internal repos not consumed elsewhere (e.g. "all gradle + all docker/compose as one backend PR");
   - **narrow** — only the coupled pair joins the group, the rest stays per-ecosystem (`mode-fine-grained-stack-groups`), recommended for libraries/OSS consumed elsewhere or large dependency trees (e.g. "postgres image + postgres driver as one PR, rest of gradle/docker stays fine-grained").

   Name the concrete coupled manifests/pair. State the stack-group trade-off in the option text: bundled member blocks lose their per-block `cooldown`, `commit-message` prefix, and forced `applies-to: security-updates` grouping (`schedule`/`labels` live on the group; `cooldown`/`commit-message`/`groups` can't sit on members).
2. **Cadence per ecosystem** — always confirm, never silently apply the mode's starting point. Propose an interval per detected ecosystem from the **Per-ecosystem cadence** heuristic (Phase 1) adjusted by PR history (Phase 1c) and repo activity level, and let the user override any of them.
3. **Review wiring** — CODEOWNERS-only (recommended for small teams) vs keep `assignees`, only if the existing config has assignees/reviewers.
4. **Existing customizations** (multiSelect) — which `ignore:` rules, labels, or schedule quirks to carry over vs drop.

## Phase 5 — Create or update

Enter this phase only once the Phase 3 pin gate is resolved — pins fixed (sibling skills run, other ecosystems patched) or floating versions explicitly accepted by the user.

- **Update > replace.** Fix the specific gaps; carry over confirmed customizations (especially `ignore:` rules) verbatim, including comments.
- **Strip teaching comments — never emit them.** The `reference/mode-*.yml` files carry long explanatory prose comments for *agent* context only; they must **not** appear in the generated `.github/dependabot.yml`. Copy the config shape, not the rationale. The written file keeps at most **brief one-line section labels in the host repo's existing comment style** (or none at all). This does not conflict with *update > replace* above: comments already present in the repo's own config (e.g. a rationale line on an `ignore:` rule) are still carried over verbatim.
- Start from the chosen `reference/mode-*.yml`, one block per detected ecosystem/directory. Templates show `weekly`/`monthly` as illustrative placeholders only — write the interval **confirmed per ecosystem in Phase 4**, not the template's literal value. For fine-grained: derive family groups from the *actual* manifests, never ship template families the repo doesn't use, and confirm the families with the user.
- Every mode keeps: `labels: ['dependencies']`, `commit-message` prefix `chore` + `include: scope`, `cooldown`, and an `applies-to: security-updates` group per ecosystem.
- If no `CODEOWNERS` exists, create `.github/CODEOWNERS` with a default owner (suggest from `gh api repos/{owner}/{repo} --jq .owner.login`):

  ```
  # Default owners — requested as reviewers on every PR, including Dependabot's
  * @<owner-or-team>
  ```

- Ensure referenced labels exist: `gh label create dependencies --description "Dependency updates" --color 0366d6` for any missing one.

### Optional companion — patch/minor auto-merge

After the `dependabot.yml` is written, **offer** (never impose) a patch/minor auto-merge workflow from `reference/automerge-workflow.yml`. This writes `.github/workflows/dependabot-automerge.yml` — a separate file from `dependabot.yml`.

**Precondition — state it, never skip it.** Auto-merge is only safe when a branch ruleset with a *required status check* gates the default branch (sibling **`branch-ruleset-setup`**) **and** a CI test job actually runs on PRs (Phase 1b). Without a required check, `gh pr merge --auto` merges the moment merge requirements are met — i.e. immediately — so CI is *not* a gate and a broken patch lands unreviewed. If the precondition isn't met, name the option and exactly what it needs (a required-check ruleset), and stop there — do not write the workflow.

When the precondition holds, confirm via **AskUserQuestion** — recommend enabling for internal/low-noise repos (CI is the gate, review capacity is the constraint); recommend *against* auto-enabling for OSS/product repos where a maintainer may want eyes on every bump:
- **Enable auto-merge (patch + minor)** — Dependabot patch/minor PRs merge once the required check passes; every major stays manual for breaking-change review.
- **No auto-merge** — every Dependabot PR waits for a manual merge.

On enable: copy `reference/automerge-workflow.yml` to `.github/workflows/dependabot-automerge.yml`, **stripping the teaching comments** (per the comment rule above — keep at most a one-line label), re-resolve the `fetch-metadata` SHA to the intended release (`gh api repos/dependabot/fetch-metadata/git/refs/tags/<tag> --jq .object.sha`), and narrow the gate only if the user asked (e.g. dev-dependencies via `contains(steps.meta.outputs.dependency-names, …)`, or an ecosystem check via `steps.meta.outputs.package-ecosystem`).

## Phase 6 — Verify

- YAML parses: `python3 -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"` (fall back to `npx --yes yaml` or careful review).
- `CODEOWNERS` check after pushing: `gh api repos/{owner}/{repo}/codeowners/errors`.
- Config errors and run logs surface under **Insights → Dependency graph → Dependabot** — tell the user to check there after the merge, since GitHub validates unknown keys only at run time.
- If the auto-merge companion was written (Phase 5), YAML-parse it too and confirm the `fetch-metadata` `uses:` is SHA-pinned. Remind the user auto-merge does nothing until a required-status-check ruleset is in place (**`branch-ruleset-setup`**).

## Sources

- Options reference: https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- Grouped updates / PR optimization: https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/optimizing-pr-creation-version-updates
- Multi-ecosystem groups: https://docs.github.com/en/code-security/dependabot/working-with-dependabot/configuring-multi-ecosystem-updates
- Targeted-pairing shape (two blocks, same ecosystem+directory, `ignore` + `patterns`/`multi-ecosystem-group`): https://github.com/dependabot/dependabot-core/discussions/12437
- Cross-directory `group-by: dependency-name` (Feb 2026): https://github.blog/changelog/2026-02-24-dependabot-can-group-updates-by-dependency-name-across-multiple-directories/
- `reviewers` removal in favor of CODEOWNERS: https://github.blog/changelog/2025-04-29-dependabot-reviewers-configuration-option-being-replaced-by-code-owners/
- Reference implementations: low-noise — https://github.com/Miragon/miravelo-shop-example/blob/main/.github/dependabot.yml · balanced — https://github.com/Miragon/bpmn-modeler/blob/main/.github/dependabot.yml
