---
name: dependabot-setup
description: "Analyzes a repo's Dependabot configuration and creates or updates it: one update block per detected ecosystem, minor+patch grouped into a single PR, majors kept separate, reviewers via CODEOWNERS (not the deprecated reviewers key), and flags unpinned dependency versions that make Dependabot PRs useless. Use when asked to set up, review, or fix Dependabot / automated dependency updates."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, AskUserQuestion
---

# Skill: dependabot-setup

Analyzes `.github/dependabot.yml` and brings it to a known-good baseline — creating it if missing, updating it if it deviates. The baseline: **every ecosystem in the repo is covered**, **minor + patch updates arrive grouped in one PR**, **major updates arrive as distinct PRs**, and **reviewers come from `CODEOWNERS`**, not from config keys.

Also verifies the precondition that makes Dependabot useful at all: **manifest versions must be fixed/exact**. If versions float (`^1.2.3`, `~1.2.3`, `latest`, a mutable tag), the resolved dependency drifts on every install and Dependabot PRs stop reflecting what actually runs — flag this for every ecosystem, always.

Run this when asked to "set up dependabot", review an existing dependabot config, or as the dependency-automation slice of a repo maturity/supply-chain audit (see the sibling skill **`release-audit`**).

## Phase 1 — Detect ecosystems

Find every manifest Dependabot can watch, including nested ones (each distinct directory needs its own `directory` or a `directories` list):

| Manifest found | `package-ecosystem` |
|---|---|
| `package.json` | `npm` |
| `.github/workflows/*.yml`, `action.yml` | `github-actions` |
| `Dockerfile*` | `docker` |
| `docker-compose*.yml` | `docker-compose` |
| `pom.xml` | `maven` |
| `build.gradle`, `build.gradle.kts` | `gradle` |
| `requirements*.txt`, `pyproject.toml` | `pip` / `uv` |
| `go.mod` | `gomod` |
| `Cargo.toml` | `cargo` |
| `*.csproj`, `packages.config` | `nuget` |
| `Gemfile` | `bundler` |
| `devcontainer.json` | `devcontainers` |

```bash
# Quick sweep (extend per table above)
fd -H -g 'package.json' -g 'Dockerfile*' -g 'pom.xml' -g 'go.mod' -g 'Cargo.toml' \
   --exclude node_modules --exclude dist 2>/dev/null || \
  find . -path ./node_modules -prune -o \( -name package.json -o -name 'Dockerfile*' -o -name pom.xml -o -name go.mod -o -name Cargo.toml \) -print
ls .github/workflows/ 2>/dev/null
```

## Phase 2 — Analyze the existing config

Read `.github/dependabot.yml` (if present) and check each update block against the baseline:

- [ ] **Coverage** — one block (or `directories` entry) per ecosystem/directory found in Phase 1; no orphan blocks for ecosystems that no longer exist.
- [ ] **Grouping** — minor + patch grouped together; **major NOT in that group** (majors need individual review, so they must arrive as separate PRs). A single group containing `major` alongside `minor`/`patch` (as some older setups do) is a finding: one breaking change blocks the whole routine-update PR.
- [ ] **Reviewers via CODEOWNERS** — the `reviewers` key in `dependabot.yml` is **deprecated by GitHub**; review assignment must come from a `CODEOWNERS` file. Flag any `reviewers:` key and verify `CODEOWNERS` exists (in `.github/`, root, or `docs/`) and has at least a default `*` owner so Dependabot PRs get reviewers.
- [ ] **Schedule** — a defined `schedule.interval` (weekly is a good default for app deps; monthly for slow-moving ecosystems like github-actions).
- [ ] **Noise control** — `open-pull-requests-limit` set (5 is a sane default), `labels: [dependencies]` for filtering.
- [ ] **Cooldown** — `cooldown.default-days: 3` (or more) so brand-new releases mature before a PR opens; this is a cheap supply-chain guard against just-published malicious versions.

## Phase 3 — Verify versions are fixed

Dependabot only produces meaningful PRs when the manifest states the exact version in use. Check per ecosystem and **flag every floating version**:

- **npm** — no `^`, `~`, `>=`, `*`, `latest`, or mutable `git#branch` refs in any `dependencies`/`devDependencies`; lockfile committed. Delegate to the sibling skill **`pin-node-dependencies`** for the full audit + fix.
- **github-actions** — every `uses:` pinned to a full 40-char commit SHA. Delegate to the sibling skill **`pin-github-actions`**.
- **docker** — base images pinned to an exact tag (better: tag + `@sha256:` digest), never `latest`.
- **maven/gradle** — no dynamic versions (`1.+`, `[1.0,)`, `latest.release`).
- **pip** — `==` pins (or a committed lockfile via uv/poetry/pip-tools).

Report unpinned entries with file:line evidence. Fixing pins is in scope when the user asks; for npm and github-actions prefer invoking the dedicated sibling skills.

## Phase 4 — Report

Present findings as a table before changing anything:

| Check | Status | Finding |
|---|---|---|
| Ecosystem coverage | ✅/❌ | e.g. "docker manifests found, no docker block" |
| Minor+patch grouped | ✅/❌ | |
| Majors separate | ✅/❌ | e.g. "group includes major — breaking changes hide in routine PRs" |
| Reviewers via CODEOWNERS | ✅/❌ | e.g. "deprecated `reviewers:` key in use, no CODEOWNERS file" |
| Versions fixed | ✅/❌ | per-ecosystem count of floating versions |
| Cooldown / limits / labels | ✅/❌ | |

If the config already matches the baseline, say so and stop.

## Phase 5 — Create or update

Ask before overwriting an existing config (preserve intentional customizations like `ignore` rules — carry them over verbatim, including their comments). Baseline template, one block per detected ecosystem:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    labels:
      - 'dependencies'
    open-pull-requests-limit: 5
    cooldown:
      default-days: 3
    groups:
      minor-and-patch:
        applies-to: version-updates
        update-types:
          - 'minor'
          - 'patch'
    # majors intentionally NOT grouped → one PR per major bump

  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'monthly'
    labels:
      - 'dependencies'
    open-pull-requests-limit: 5
    cooldown:
      default-days: 3
    groups:
      minor-and-patch:
        applies-to: version-updates
        update-types:
          - 'minor'
          - 'patch'
```

If no `CODEOWNERS` exists, create `.github/CODEOWNERS` with a default owner (ask the user who; suggest the repo owner or maintainer team from `gh api repos/{owner}/{repo} --jq .owner.login`):

```
# Default owners — requested as reviewers on every PR, including Dependabot's
* @<owner-or-team>
```

Validate the result: `dependabot.yml` must parse as YAML (`python3 -c "import yaml,sys; yaml.safe_load(open('.github/dependabot.yml'))"` — fall back to `npx yaml` or careful review if PyYAML is unavailable) and `CODEOWNERS` syntax can be checked via `gh api repos/{owner}/{repo}/codeowners/errors` once pushed.

## Sources

- Dependabot options reference: https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference
- Grouped updates: https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/optimizing-pr-creation-version-updates
- Deprecation of `reviewers` in favor of CODEOWNERS: https://github.blog/changelog/2025-04-29-dependabot-reviewers-configuration-option-being-replaced-by-code-owners/
- CODEOWNERS syntax: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- Reference implementation: https://github.com/Miragon/wardley-maps-modeler/blob/main/.github/dependabot.yml
