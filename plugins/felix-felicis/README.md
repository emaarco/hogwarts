# felix-felicis

Liquid luck for the boring parts of running a repo.

These are the skills I use to get a repository into a state where agents — and humans — can ship safely: pinned dependencies, a protected default branch, releases that cut themselves, dependency updates that merge without me. Plus a handful of everyday chores I got tired of doing by hand.

Each skill is small and does one thing. Most of them audit first, show you the evidence, and only then change anything. None of them need a build step, a hook, or a runtime dependency — they are plain `SKILL.md` files driving tools you already have (`gh`, `glab`, `npx`, `curl`).

## Installation

```bash
/plugin marketplace add emaarco/hogwarts     # once per machine
/plugin install felix-felicis@emaarco
```

That's it. Every skill below is now available as a slash command, and Claude reaches for them on its own when a task matches.

Not sure where to start? Run [`/maturity-analysis`](./skills/maturity-analysis/SKILL.md) on a repo. It tells you what's missing, and most of what it finds maps to one of the skills below.

## Why These Skills Exist

Every one of these started as a problem I hit more than twice.

### #1: A Green Build Doesn't Mean What You Think

**The Problem.** `actions/checkout@v4` and `"react": "^19.0.0"` look pinned, but tags move and ranges float — and a long-lived `NPM_TOKEN` is one leak away from someone else publishing your package.

**The Fix** is immutable references and short-lived credentials:

- [`/pin-github-actions`](./skills/pin-github-actions/SKILL.md) — for workflow actions
- [`/pin-node-dependencies`](./skills/pin-node-dependencies/SKILL.md) — for npm dependencies
- [`/secure-publish-setup`](./skills/secure-publish-setup/SKILL.md) — for publishing
- [`/release-audit`](./skills/release-audit/SKILL.md) — to check all of it at once

### #2: Dependency Updates Pile Up

**The Problem.** Pinned dependencies mean a steady stream of update PRs, and one red PR blocks the green ones behind it.

**The Fix** is less noise and fewer manual merges:

- [`/dependabot-setup`](./skills/dependabot-setup/SKILL.md) — to group the updates
- [`/automerge-setup`](./skills/automerge-setup/SKILL.md) — to merge the green ones
- [`/dependency-update-shepherd`](./skills/dependency-update-shepherd/SKILL.md) — to rescue the red ones

### #3: Agents Erode Quality Quietly

**The Problem.** An agent that can't make a test pass will lower the threshold, skip the test, or route around the rule.

**The Fix** is standards a machine can enforce:

- [`/guardrails-setup`](./skills/guardrails-setup/SKILL.md) — for gates in the codebase
- [`/branch-ruleset-setup`](./skills/branch-ruleset-setup/SKILL.md) — for the default branch
- [`/optimize-github-actions`](./skills/optimize-github-actions/SKILL.md) — to keep CI fast enough to keep the gates

### #4: Releasing Is A Ritual

**The Problem.** Bump, changelog, tag, publish — it works until the one person who knows the steps is on holiday.

**The Fix** is to derive releases from the commit history:

- [`/release-please-setup`](./skills/release-please-setup/SKILL.md) — for versions, changelogs, and releases
- [`/pull-request-description`](./skills/pull-request-description/SKILL.md) — for the commit titles it depends on

### #5: Parallel Agents Fight Over `localhost:3000`

**The Problem.** Two agents in two worktrees start a dev server, and you no longer know which tab belongs to which branch.

**The Fix** is a stable URL per worktree:

- [`/portless-dev-setup`](./skills/portless-dev-setup/SKILL.md) — for the dev server URLs
- [`/conductor-setup`](./skills/conductor-setup/SKILL.md) — for the workspace scripts

### Summary

Pin it, protect it, automate it — then an agent can do real work in the repo without supervision.

## Reference

Skills marked `beta` are new and not yet battle-tested on real repos — expect rough edges and review their output more carefully.

### Repo Health

Find out where a repo stands, then keep it there.

- **[maturity-analysis](./skills/maturity-analysis/SKILL.md)**: Project overview, key files, a maturity assessment across six dimensions, and a prioritized issue list.
- **[guardrails-setup](./skills/guardrails-setup/SKILL.md)** `beta`: Automated quality gates (architecture rules, raise-only coverage, shrink-only debt lists) sized to the repo. Can also audit existing gates.
- **[branch-ruleset-setup](./skills/branch-ruleset-setup/SKILL.md)** `beta`: A GitHub ruleset protecting the default branch: no deletion or force-push, linear history, signed commits, PR-only changes, and a required CI check.
- **[contributor-setup](./skills/contributor-setup/SKILL.md)**: Whatever a repo is missing for contributors: issue templates, README, `CONTRIBUTING.md`, and the other community-health files.

### Supply Chain & Releases

Immutable inputs, tokenless outputs.

- **[pin-github-actions](./skills/pin-github-actions/SKILL.md)**: Checks every GitHub Actions `uses:` reference is pinned to a full commit SHA, and optionally rewrites the unpinned ones to SHA + version comment.
- **[pin-node-dependencies](./skills/pin-node-dependencies/SKILL.md)**: Checks every `package.json` dependency is pinned to an exact version and the lockfile is committed, optionally rewrites ranges, and adds a CI guardrail.
- **[release-please-setup](./skills/release-please-setup/SKILL.md)** `beta`: Sets up release-please as a single or per-module release, audits an existing setup, or switches release forms without breaking tag and changelog history.
- **[secure-publish-setup](./skills/secure-publish-setup/SKILL.md)** `beta`: Tokenless npm publishing via OIDC trusted publishing: no `NPM_TOKEN` secret, automatic provenance attestations, and a publish step that is safe to re-run.
- **[release-audit](./skills/release-audit/SKILL.md)** `beta`: Audits release and supply-chain readiness against a gold-standard reference and returns a prioritized action plan, with fixes delegated to the matching setup skills.

### CI & Dependency Updates

Less noise, fewer red PRs.

- **[dependabot-setup](./skills/dependabot-setup/SKILL.md)** `beta`: Audits or sets up `.github/dependabot.yml` with a grouping mode (low-noise, balanced, or fine-grained) recommended from the repo's use-case.
- **[automerge-setup](./skills/automerge-setup/SKILL.md)** `beta`: Sets up or audits PR auto-merge for Dependabot, Renovate, or other bot PRs, limited to what the repo's CI actually proves.
- **[dependency-update-shepherd](./skills/dependency-update-shepherd/SKILL.md)** `beta`: Gets red or stale Renovate/Dependabot PRs/MRs mergeable without asking you: fixes the root-cause CI failure or holds the offending bump back. Merges only on request.
- **[optimize-github-actions](./skills/optimize-github-actions/SKILL.md)** `beta`: Finds wasted CI runs — duplicate PR runs, matrix job explosion, missing concurrency — and fixes trigger scoping without breaking required status checks.

### Dev Environment

For running many agents side by side.

- **[portless-dev-setup](./skills/portless-dev-setup/SKILL.md)**: Sets up [portless](https://portless.sh) for stable, worktree-aware `.localhost` dev URLs on the JS/TS frontend dev server and wires it into Conductor.
- **[conductor-setup](./skills/conductor-setup/SKILL.md)**: Writes a repo's `.conductor/settings.toml`: a setup script, a menu of selectable run targets instead of one auto-starting script, and an archive script for cleanup.

### Tickets & Pull Requests

- **[create-github-ticket](./skills/create-github-ticket/SKILL.md)**: Creates or updates a GitHub issue (bug, feature, or refactor) via `gh`, using the repo's issue templates and confirming the draft with you first.
- **[pull-request-description](./skills/pull-request-description/SKILL.md)** `beta`: Drafts a Conventional-Commit title and a compact body that links its issue, then creates or updates the PR/MR via `gh` or `glab`.
- **[make-me-awesome](./skills/make-me-awesome/SKILL.md)**: Researches a GitHub repo, picks the best-fit category in an awesome list, and submits it as a PR or issue after you confirm. Usage: `/make-me-awesome [REPO_TO_PROMOTE] [AWESOME_LIST_REPO]`.

### Writing & Slides

- **[translate-post](./skills/translate-post/SKILL.md)** `beta`: Translates a blog post, then loops a fresh reviewer agent over it until it reads as if written in the target language. Can also polish an existing translation.
- **[medium-publish](./skills/medium-publish/SKILL.md)**: Copies a Markdown blog post to the clipboard as rich text and opens Medium's editor so you paste it with ⌘V (macOS). Images become placeholders.
- **[slidev-toolkit-migration](./skills/slidev-toolkit-migration/SKILL.md)** `beta`: Migrates an existing [Slidev](https://sli.dev) deck onto the [Miragon slidev-toolkit template](https://github.com/Miragon/slidev-deck-template), slide by slide, each chapter built and verified before the next.

### Everyday Chores

General workflow tools, not code-specific.

- **[clockify](./skills/clockify/SKILL.md)** `beta`: Reads and books [Clockify](https://clockify.me) time entries and timers via its REST API, previewing every write for your confirmation. Needs the `CLOCKIFY_*` env vars; times are Europe/Berlin.
- **[bpmn-export](./skills/bpmn-export/SKILL.md)**: Exports a BPMN file to an image (SVG, PNG, or PDF) using `npx bpmn-to-image`.
- **[svg-to-png](./skills/svg-to-png/SKILL.md)** `beta`: Renders an SVG to a PNG locally with the [`resvg`](https://github.com/linebender/resvg) CLI, with optional scaling, DPI, background, or crop.

### Rules

Not skills — path-scoped rules that activate on their own when you touch a matching file.

- **[kotlin-style](./commands/kotlin-style.md)** (`**/*.kt`): One element per line in multi-line collection literals; function bodies over expression bodies for multi-line functions.
- **[typescript-style](./commands/typescript-style.md)** (`**/*.ts`, `**/*.tsx`): Descriptive variable names, no abbreviations.
- **[package-json-style](./commands/package-json-style.md)** (`**/package.json`): Exact dependency versions — no `^`, `~`, or other ranges.

## License

MIT
