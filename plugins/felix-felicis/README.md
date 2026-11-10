# 🍀 Felix Felicis

> *Felix Felicis* — liquid luck. One sip, and the boring parts of running a repo go your way.

**Get a repo into a state where agents — and humans — can ship safely, without doing the chores by hand.**

These are the skills I use for that: an audit of what's missing, a protected default branch, releases that cut themselves, dependency updates that get green without me. Plus a handful of everyday chores I got tired of.

Each skill is small and does one thing. Most of them audit first, show you the evidence, and only then change anything; the ones that push or open PRs on their own say so below. None of them need a build step or a hook: they are plain `SKILL.md` files driving tools like `gh`, `glab`, `npx` and `jq`, and the few that need more (`resvg`, Graphviz) say so or install it on first run.

## ⚡ Install

Inside Claude Code:

```text
/plugin marketplace add emaarco/hogwarts     # once per machine
/plugin install felix-felicis@emaarco
```

That's it. Every skill below is now a slash command. Most of them only run when you cast them; `bpmn-export` and `svg-to-png` Claude also reaches for on its own when a task matches.

Not sure where to start? Run [`/maturity-analysis`](./skills/maturity-analysis/SKILL.md) on a repo. It tells you what's missing, and most of what it finds maps to one of the skills below.

## 🧪 Why These Skills Exist

Every one of these started as a problem I hit more than twice. Skills marked *(Miragon)* come from the separate [Miragon skills](https://github.com/Miragon/skills) marketplace, which brews well with this one:

```text
/plugin marketplace add Miragon/skills
/plugin install miragon-github@miragon-agent-skills
/plugin install miragon-implementation@miragon-agent-skills
```

### #1: A Green Build Doesn't Mean What You Think

**The Problem.** `actions/checkout@v4` and `"react": "^19.0.0"` look pinned, but tags move and ranges float — and a long-lived `NPM_TOKEN` is one leak away from someone else publishing your package.

**The Fix** is immutable references and short-lived credentials:

- [`/pin-github-actions`](https://github.com/Miragon/skills/tree/main/plugins/miragon-implementation/skills/pin-github-actions) *(Miragon)* — for workflow actions
- [`/pin-node-dependencies`](https://github.com/Miragon/skills/tree/main/plugins/miragon-implementation/skills/pin-node-dependencies) *(Miragon)* — for npm dependencies
- [`/secure-publish-setup`](./skills/secure-publish-setup/SKILL.md) — for publishing
- [`/release-audit`](./skills/release-audit/SKILL.md) — to check all of it at once

### #2: Dependency Updates Pile Up

**The Problem.** Pinned dependencies mean a steady stream of update PRs, and one red PR blocks the green ones behind it.

**The Fix** is less noise and fewer manual merges:

- [`/dependabot-setup`](https://github.com/Miragon/skills/tree/main/plugins/miragon-github/skills/dependabot-setup) *(Miragon)* — to group the updates
- [`/automerge-setup`](https://github.com/Miragon/skills/tree/main/plugins/miragon-github/skills/automerge-setup) *(Miragon)* — to merge the green ones
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
- [`/write-pr-description`](https://github.com/Miragon/skills/tree/main/plugins/miragon-github/skills/write-pr-description) *(Miragon)* — for the commit titles it depends on

### #5: Parallel Agents Fight Over `localhost:3000`

**The Problem.** Two agents in two worktrees start a dev server, and you no longer know which tab belongs to which branch.

**The Fix** is a stable URL per worktree:

- [`/portless-dev-setup`](./skills/portless-dev-setup/SKILL.md) — for the dev server URLs
- [`/conductor-setup`](./skills/conductor-setup/SKILL.md) — for the workspace scripts

### Summary

Pin it, protect it, automate it — then an agent can do real work in the repo without supervision. That's the luck.

## 📖 Reference

Skills marked `beta` are new and not yet battle-tested on real repos — expect rough edges and review their output more carefully. Skills marked `GitHub` work on GitHub only, `macOS` ones only on a Mac.

### 🏥 Repo Health

Find out where a repo stands, then keep it there.

- **[maturity-analysis](./skills/maturity-analysis/SKILL.md)**: Project overview, key files, a maturity assessment across six dimensions, and a prioritized issue list.
- **[guardrails-setup](./skills/guardrails-setup/SKILL.md)** `beta` `GitHub`: Automated quality gates (architecture rules, raise-only coverage, shrink-only debt lists) sized to the repo. Can also audit existing gates.
- **[dependency-graph](./skills/dependency-graph/SKILL.md)** `beta`: Draws the folder-level import graph of a TS/JS or Java/Kotlin codebase: the whole picture first, then folder cycles and upward leaks against a layer order, each traced to the importing files, in a visual HTML report with recommendation cards. Offers the matching rules to enforce the layering.
- **[close-external-prs](./skills/close-external-prs/SKILL.md)** `beta` `GitHub`: Stops accepting external pull requests: restricts PR creation to collaborators, closes open external PRs with a comment pointing to issues, and notes the policy in CONTRIBUTING.md.
- **[branch-ruleset-setup](./skills/branch-ruleset-setup/SKILL.md)** `beta` `GitHub`: A GitHub ruleset protecting the default branch: no deletion or force-push, linear history, signed commits, PR-only changes, and a required CI check.

### 🔒 Supply Chain & Releases

Immutable inputs, tokenless outputs.

- **[release-please-setup](./skills/release-please-setup/SKILL.md)** `beta` `GitHub`: Sets up release-please as a single or per-module release, audits an existing setup, or switches release forms without breaking tag and changelog history.
- **[secure-publish-setup](./skills/secure-publish-setup/SKILL.md)** `beta` `GitHub`: Tokenless npm publishing via OIDC trusted publishing: no `NPM_TOKEN` secret, automatic provenance attestations, and a publish step that is safe to re-run.
- **[release-audit](./skills/release-audit/SKILL.md)** `beta` `GitHub`: Audits release and supply-chain readiness against a gold-standard reference and returns a prioritized action plan, with fixes delegated to the matching setup skills.

### 🤖 CI & Dependency Updates

Less noise, fewer red PRs.

- **[dependency-update-shepherd](./skills/dependency-update-shepherd/SKILL.md)** `beta`: Gets red or stale Renovate/Dependabot PRs on GitHub and MRs on GitLab mergeable without asking you: fixes the root-cause CI failure or holds the offending bump back. Merges only on request.
- **[optimize-github-actions](./skills/optimize-github-actions/SKILL.md)** `beta` `GitHub`: Finds wasted CI runs — duplicate PR runs, matrix job explosion, missing concurrency — and fixes trigger scoping without breaking required status checks.

### 🧰 Dev Environment

For running many agents side by side.

- **[portless-dev-setup](./skills/portless-dev-setup/SKILL.md)**: Sets up [portless](https://portless.sh) for stable, worktree-aware `.localhost` dev URLs on the JS/TS frontend dev server and wires it into [Conductor](https://conductor.build).
- **[conductor-setup](./skills/conductor-setup/SKILL.md)**: Writes a repo's `.conductor/settings.toml`: a setup script, a menu of selectable run targets instead of one auto-starting script, and an archive script for cleanup.

### 🎫 Tickets & Pull Requests

- **[make-me-awesome](./skills/make-me-awesome/SKILL.md)** `GitHub`: Researches a GitHub repo, picks the best-fit category in an awesome list, and submits it as a PR or issue after you confirm. Usage: `/make-me-awesome [REPO_TO_PROMOTE] [AWESOME_LIST_REPO]`.

### ✍️ Writing & Slides

- **[translate-post](./skills/translate-post/SKILL.md)** `beta`: Translates a blog post, then loops a fresh reviewer agent over it until it reads as if written in the target language. Can also polish an existing translation.
- **[medium-publish](./skills/medium-publish/SKILL.md)** `macOS`: Copies a Markdown blog post to the clipboard as rich text and opens Medium's editor so you paste it with ⌘V. Images become `[Bild N]` placeholders.
- **[slidev-toolkit-migration](./skills/slidev-toolkit-migration/SKILL.md)** `beta`: Migrates an existing [Slidev](https://sli.dev) deck onto the [Miragon slidev-toolkit template](https://github.com/Miragon/slidev-deck-template), slide by slide, each chapter built and verified before the next.

### 🧹 Everyday Chores

General workflow tools, not code-specific.

- **[clockify](./skills/clockify/SKILL.md)** `beta`: Reads and books [Clockify](https://clockify.me) time entries and timers via its REST API, previewing every write for your confirmation. Needs the `CLOCKIFY_*` env vars (the setup assumes `~/.zshrc` and the macOS Keychain) and `jq`; output is partly German and times are Europe/Berlin.
- **[bpmn-export](./skills/bpmn-export/SKILL.md)**: Exports a BPMN file to an image (SVG, PNG, or PDF) using `npx bpmn-to-image`.
- **[svg-to-png](./skills/svg-to-png/SKILL.md)** `beta`: Renders an SVG to a PNG locally with the [`resvg`](https://github.com/linebender/resvg) CLI, with optional scaling, DPI, background, or crop.

## 🦉 Help and feedback

Found a bug or missing a skill? [Open an issue](https://github.com/emaarco/hogwarts/issues/new/choose). Contributing: [CONTRIBUTING.md](../../CONTRIBUTING.md).

## 📜 License

[MIT](../../LICENSE)
