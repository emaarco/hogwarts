# felix-felicis

Claude Code plugin for everyday automation tasks.

## Architecture

Pure skill-based plugin — no hooks, no build step, no runtime dependencies.
Skills live in `skills/<skill-name>/SKILL.md`. Path-scoped rules live in `commands/<name>.md`.

## Skills

- **maturity-analysis** — End-to-end repo analysis: project overview, key files, maturity assessment (parallel expert subagents per dimension), and prioritized issues.
- **pin-github-actions** — Supply-chain audit: verifies every GitHub Actions `uses:` reference is pinned to a full commit SHA, reports unpinned references, and optionally rewrites them to SHA + version comment.
- **pin-node-dependencies** — Supply-chain audit: verifies every `package.json` dependency is pinned to an exact version, checks the committed lockfile, and wires up the `Miragon/pin-npm-dependencies` CI guardrail + `save-exact`.
- **dependabot-setup** — Analyzes and creates/updates `.github/dependabot.yml`: one block per detected ecosystem, minor+patch grouped, majors as separate PRs, reviewers via CODEOWNERS (deprecated `reviewers` key flagged), and flags floating dependency versions that make Dependabot PRs meaningless.
- **contributor-setup** — Analyzes contributor experience and creates/updates what's missing: issue-form templates, an open-source target-group-focused README, CONTRIBUTING.md, and the remaining community-health files (PR template, CoC, SECURITY, LICENSE, CODEOWNERS).
- **make-me-awesome** — Analyzes a GitHub repo and submits it to an awesome list via PR or issue.
- **medium-publish** — Publishes a Markdown file to Medium via a temporary GitHub Gist import.
- **outlook-invitation** — Creates a German Outlook meeting invitation ready to copy-paste or auto-fill into a calendar event (macOS).
- **bpmn-export** — Exports a BPMN file to an image (SVG, PNG, or PDF) using `npx bpmn-to-image`.
- **portless-dev-setup** — Adopts portless (pinned devDependency + `portless.json` + `dev`/`dev:app` split) for stable, worktree-aware `.localhost` dev URLs, wires it into `.conductor/settings.toml`, and researches per-workspace isolation for the non-frontend components portless can't cover.

## Rules

Path-scoped rules in `commands/` are flat `.md` files with `paths:` frontmatter. Claude Code auto-activates them when matching file types are in scope — no hook or installation step required.

- **kotlin-style** (`**/*.kt`) — Collection literal and function-body style conventions.
- **typescript-style** (`**/*.ts`, `**/*.tsx`) — Descriptive variable naming conventions (no abbreviations).
- **package-json-style** (`**/package.json`) — Enforce exact/fixed dependency versions; no `^`, `~`, or other ranges.

## Adding a New Skill

Create `skills/<skill-name>/SKILL.md` with standard frontmatter:

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
