# felix-felicis

Claude Code plugin for everyday automation tasks.

## Architecture

Pure skill-based plugin — no hooks, no build step, no runtime dependencies.
Skills live in `skills/<skill-name>/SKILL.md`. Path-scoped rules live in `commands/<name>.md`.

## Skills

- **maturity-analysis** — Analyzes the current repo end to end and reports a project overview, the key files, a maturity assessment across six dimensions, and a prioritized issue list.
- **pin-github-actions** — Checks that every GitHub Actions `uses:` reference is pinned to a full commit SHA, reports the unpinned ones, and optionally rewrites them to SHA + version comment.
- **pin-node-dependencies** — Checks that every `package.json` dependency is pinned to an exact version and the lockfile is committed, optionally rewrites ranges to exact pins, and adds a CI guardrail.
- **contributor-setup** — Creates or updates what a repo is missing for contributors: issue templates, README, `CONTRIBUTING.md`, and the other community-health files.
- **make-me-awesome** — Researches a GitHub repo, picks the best-fit category in an awesome list, and submits it as a PR or issue after you confirm.
- **medium-publish** — Copies a Markdown blog post to the clipboard as rich text and opens Medium's editor so you paste it with ⌘V (macOS). Images become placeholders.
- **outlook-invitation** — Creates a German Outlook meeting invitation with context, goals, and agenda, ready to copy-paste. On macOS it can also auto-fill a new Outlook event.
- **bpmn-export** — Exports a BPMN file to an image (SVG, PNG, or PDF) using `npx bpmn-to-image`.
- **portless-dev-setup** — Sets up portless for stable, worktree-aware `.localhost` dev URLs on the JS/TS frontend dev server and wires it into Conductor.
- **conductor-setup** — Writes a repo's `.conductor/settings.toml`: a setup script, a menu of selectable run targets instead of one auto-starting script, and an archive script for cleanup.
- **create-github-ticket** — Creates or updates a GitHub issue (bug, feature, or refactor) via `gh`, using the repo's issue templates and confirming the draft with you before writing.

### Beta Skills

New and not yet battle-tested on real repos — see [Skill Status](#skill-status).

- **optimize-github-actions** — Finds wasted CI runs in GitHub Actions — duplicate PR runs, matrix job explosion, missing concurrency — and fixes trigger scoping without breaking required status checks.
- **dependabot-setup** — Audits or sets up `.github/dependabot.yml` with a grouping mode (low-noise, balanced, or fine-grained) recommended from the repo's use-case. Flags unpinned versions first and offers to pin them.
- **branch-ruleset-setup** — Creates or updates a GitHub ruleset protecting the default branch: no deletion or force-push, linear history, signed commits, PR-only changes, and a required CI check.
- **automerge-setup** — Sets up or audits GitHub PR auto-merge for Dependabot, Renovate, or other bot PRs, and limits what gets auto-merged to what the repo's CI actually proves.
- **release-please-setup** — Sets up release-please as a single or per-module release, audits an existing setup, or switches release forms without breaking tag and changelog history.
- **secure-publish-setup** — Sets up tokenless npm publishing via OIDC trusted publishing: no `NPM_TOKEN` secret, automatic provenance attestations, and a publish step that is safe to re-run.
- **release-audit** — Audits release and supply-chain readiness against a gold-standard reference and returns a prioritized action plan, with fixes delegated to the matching setup skills.
- **svg-to-png** — Renders an SVG to a PNG locally with the `resvg` CLI, with optional scaling, DPI, background, or crop. Other raster formats go through a PNG intermediate.
- **pull-request-description** — Drafts a Conventional-Commit title and a compact body that links its issue, following the repo's own conventions and template, then creates or updates the PR/MR via `gh` or `glab`.
- **translate-post** — Translates a blog post into a language you choose, then loops a fresh reviewer agent over it until it reads as if written in that language. Can also polish an existing translation.
- **guardrails-setup** — Adds automated quality gates (architecture rules, raise-only coverage, shrink-only debt lists) sized to the repo, so AI agents can change code safely. Can also audit existing gates.
- **slidev-toolkit-migration** — Migrates an existing Slidev deck onto the Miragon slidev-toolkit template, slide by slide, with each chapter built and verified before the next.
- **dependency-update-shepherd** — Gets red or stale Renovate/Dependabot PRs/MRs mergeable without asking you: fixes the root-cause CI failure or holds the offending bump back. Merges only on request.
- **clockify** — Reads and books Clockify time entries and timers via its REST API, previewing every write for your confirmation. Needs the `CLOCKIFY_*` env vars; times are Europe/Berlin.

## Rules

Path-scoped rules in `commands/` are flat `.md` files with `paths:` frontmatter. Claude Code auto-activates them when matching file types are in scope — no hook or installation step required.

- **kotlin-style** (`**/*.kt`) — Collection literal and function-body style conventions.
- **typescript-style** (`**/*.ts`, `**/*.tsx`) — Descriptive variable naming conventions (no abbreviations).
- **package-json-style** (`**/package.json`) — Enforce exact/fixed dependency versions; no `^`, `~`, or other ranges.

## Skill Status

Skills under **Beta Skills** are new and not yet battle-tested on real repos — expect rough edges and review their output more carefully. The categorization lives in two places that must stay in sync (never in the SKILL.md frontmatter):

1. This file — beta skills go in the separate **Beta Skills** list, stable skills in the main list.
2. `README.md` — skills are grouped by theme under **Reference**; beta skills carry a `beta` marker after their name.

A skill graduates (move it to the main list here and drop its `beta` marker in `README.md`) once it has been run successfully against at least a couple of real repos. Main list means stable.

## Adding a New Skill

Create `skills/<skill-name>/SKILL.md` with standard frontmatter (list new skills under **Beta Skills** in this file and mark them `beta` in `README.md` per the Skill Status section):

```
---
name: <skill-name>
description: "One-line description shown in command discovery."
allowed-tools: AskUserQuestion
---
```

## Scope Boundaries

- No hooks — this plugin does not intercept tool calls or session events
- No external dependencies — skills use only standard Claude Code tools (Bash, WebFetch, AskUserQuestion)
- Skills must remain generic — no company-specific context, credentials, or private system references
