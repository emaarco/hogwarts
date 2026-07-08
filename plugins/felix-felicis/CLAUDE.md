# felix-felicis

Claude Code plugin for everyday automation tasks.

## Architecture

Pure skill-based plugin — no hooks, no build step, no runtime dependencies.
Skills live in `skills/<skill-name>/SKILL.md`. Path-scoped rules live in `commands/<name>.md`.

## Skills

- **maturity-analysis** — End-to-end repo analysis: project overview, key files, maturity assessment (parallel expert subagents per dimension), and prioritized issues.
- **pin-github-actions** — Supply-chain audit: verifies every GitHub Actions `uses:` reference is pinned to a full commit SHA, reports unpinned references, and optionally rewrites them to SHA + version comment.
- **pin-node-dependencies** — Supply-chain audit: verifies every `package.json` dependency is pinned to an exact version, checks the committed lockfile, and wires up the `Miragon/pin-npm-dependencies` CI guardrail + `save-exact`.
- **contributor-setup** — Analyzes contributor experience and creates/updates what's missing: issue-form templates, an open-source target-group-focused README, CONTRIBUTING.md, and the remaining community-health files (PR template, CoC, SECURITY, LICENSE, CODEOWNERS).
- **make-me-awesome** — Analyzes a GitHub repo and submits it to an awesome list via PR or issue.
- **medium-publish** — Publishes a Markdown file to Medium via a temporary GitHub Gist import.
- **outlook-invitation** — Creates a German Outlook meeting invitation ready to copy-paste or auto-fill into a calendar event (macOS).
- **bpmn-export** — Exports a BPMN file to an image (SVG, PNG, or PDF) using `npx bpmn-to-image`.
- **portless-dev-setup** — Adopts portless (pinned devDependency + `portless.json` + `dev`/`dev:app` split) for stable, worktree-aware `.localhost` dev URLs, wires it into `.conductor/settings.toml`, and researches per-workspace isolation for the non-frontend components portless can't cover.

### Beta Skills

New and not yet battle-tested on real repos — see [Skill Status](#skill-status).

- **dependabot-setup** — Collaborative Dependabot audit & setup with three grouping modes (low-noise / balanced / fine-grained, templates in `reference/`). Recommends a mode from the repo's use-case (open-source vs internal, what it ships and to whom, CI safety net) with update history used only for fine-tuning, confirms via AskUserQuestion, cleans dead config (removed `reviewers` key, redundant `target-branch`, duplicate blocks, CODEOWNERS over `assignees`), groups security updates, enforces cooldown, and gates setup on pinned dependency versions, delegating fixes to the `pin-github-actions` / `pin-node-dependencies` siblings.
- **branch-ruleset-setup** — Sets up an idempotent GitHub branch ruleset on the default branch via `gh api` (no deletion, no force-push, linear history, signed commits, PR-only, required CI check with dynamically resolved `integration_id`).
- **release-please-setup** — Sets up release-please (config + manifest + workflow) with a GitHub App token for authentication (never the default `GITHUB_TOKEN`), plus Conventional-Commit PR-title validation for squash-merge repos.
- **secure-publish-setup** — Tokenless npm publishing via OIDC trusted publishing: no `NPM_TOKEN`, automatic provenance, idempotent publish step, GitHub Environments for unavoidable long-lived secrets.
- **release-audit** — Orchestrator: evidence-based release & supply-chain readiness audit with an adversarial review subagent; delegates fixes to sibling skills (`pin-*`, `dependabot-setup`, `branch-ruleset-setup`, `release-please-setup`, `secure-publish-setup`, `contributor-setup`).

## Rules

Path-scoped rules in `commands/` are flat `.md` files with `paths:` frontmatter. Claude Code auto-activates them when matching file types are in scope — no hook or installation step required.

- **kotlin-style** (`**/*.kt`) — Collection literal and function-body style conventions.
- **typescript-style** (`**/*.ts`, `**/*.tsx`) — Descriptive variable naming conventions (no abbreviations).
- **package-json-style** (`**/package.json`) — Enforce exact/fixed dependency versions; no `^`, `~`, or other ranges.

## Skill Status

Skills under **Beta Skills** are new and not yet battle-tested on real repos — expect rough edges and review their output more carefully. The categorization lives in two places that must stay in sync (never in the SKILL.md frontmatter):

1. This file — beta skills go in the separate **Beta Skills** list, stable skills in the main list.
2. `README.md` — the same split under its **Beta Skills** section.

A skill graduates (move it to the main list in both files) once it has been run successfully against at least a couple of real repos. Main list means stable.

## Adding a New Skill

Create `skills/<skill-name>/SKILL.md` with standard frontmatter (list new skills under **Beta Skills** in this file and `README.md` per the Skill Status section):

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
