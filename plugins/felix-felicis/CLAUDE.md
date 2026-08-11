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
- **conductor-setup** — Sets up a repo's full Conductor workspace lifecycle in `.conductor/settings.toml`: install/setup script, selectable Run targets (menu instead of one auto-starting script), and archive cleanup on workspace removal.
- **create-github-ticket** — Creates or updates GitHub issues (feature / bug / refactor) via the `gh` CLI. Detects create vs. update mode from `$ARGUMENTS`, optionally researches unfamiliar topics with WebSearch/WebFetch, discovers `.github/ISSUE_TEMPLATE/` in the current or a referenced repo (falling back to bundled `references/` templates), drafts and confirms the issue interactively, then creates/edits it and reports the final state.

### Beta Skills

New and not yet battle-tested on real repos — see [Skill Status](#skill-status).

- **dependabot-setup** — Collaborative Dependabot audit & setup with three grouping modes (low-noise / balanced / fine-grained, templates in `reference/`). Recommends a mode from the repo's use-case (open-source vs internal, what it ships and to whom, CI safety net) with update history used only for fine-tuning, confirms via AskUserQuestion, cleans dead config (removed `reviewers` key, redundant `target-branch`, duplicate blocks, CODEOWNERS over `assignees`), groups security updates, enforces cooldown, and gates setup on pinned dependency versions, delegating fixes to the `pin-github-actions` / `pin-node-dependencies` siblings.
- **branch-ruleset-setup** — Sets up an idempotent GitHub branch ruleset on the default branch via `gh api` (no deletion, no force-push, linear history, signed commits, PR-only, required CI check with dynamically resolved `integration_id`).
- **release-please-setup** — Sets up, audits, **or** optimizes release-please. Phase 0 detects any existing install and branches: greenfield → create config + manifest + workflow (GitHub App token auth, never the default `GITHUB_TOKEN`) + PR-title validation; already installed → Phase 8 audit that mainly questions whether the setup still makes sense (release form vs. today's topology, validation vs. merge strategy, publishing, auth → decisions) and catches mechanical drift (dangling `extra-files` paths, untracked packages, versions out of sync with the manifest → defects), resolved via `AskUserQuestion`, respecting deliberate conventions.
- **secure-publish-setup** — Tokenless npm publishing via OIDC trusted publishing: no `NPM_TOKEN`, automatic provenance, idempotent publish step, GitHub Environments for unavoidable long-lived secrets, and a bundled one-time check (`scripts/check-publish-metadata.mjs`) verifying each package's `repository` field at setup so provenance can't E422.
- **release-audit** — Orchestrator: evidence-based release & supply-chain readiness audit with an adversarial review subagent; delegates fixes to sibling skills (`pin-*`, `dependabot-setup`, `branch-ruleset-setup`, `release-please-setup`, `secure-publish-setup`, `contributor-setup`).
- **svg-to-png** — Renders an SVG to a PNG locally with the `resvg` CLI (no web-upload round-trip). Checks the `resvg --version` precondition (install via `brew install resvg`), derives the output path from the source, and applies scaling/DPI/background/crop/export-id flags as the request needs; for non-PNG raster targets it renders to PNG first, then converts with the macOS built-in `sips` (or `cwebp` for WebP). resvg is SVG→PNG only — no PNG→SVG tracing, no direct JPG/PDF.
- **pull-request-description** — Drafts a consistent PR/MR title and body, then creates or updates it via `gh`/`glab`. Title defaults to Conventional Commits, respecting repo-defined types/scopes (commitlint, release-please, PR-title lint, CONTRIBUTING). Body follows the repo's PR/MR template if any, else a bundled compact default (Why → What → Verification, issue link as the last line) in `references/`. Discovers and links the built-upon issue with the right closing/reference keyword.
- **translate-post** — Translates a blog post/article into a user-specified target language so it reads as if written, not translated: preserves code/URLs/product names, applies a whiteboard test for technical terminology, then loops a fresh, isolated native-speaker reviewer over the text (5-round cap) until no source-language interference remains, and runs a faithfulness check against the source. Language-agnostic and structure-free — the user supplies the input file and the target language. Also runs the nativeness loop alone on a file already in the target language.
- **slidev-toolkit-migration** — Migrates an existing Slidev deck onto the Miragon slidev-toolkit template (`@miragon/slidev-toolkit`). Fixed target, variable source (own theme/components or plain markdown, detected in Phase 0). Scripts do the mechanics (clone+read the template, scaffold one deck per topic with the toolkit pinned from npm, enumerate slides via `@slidev/parser` — never regex, asset moves, leftover raw-HTML/old-component reports); the per-slide translation is deliberate handwork behind a source→toolkit mapping table (callouts→bullets/Card, exercise→content+CardGrid, interactive Vue→a single `*-customs` last-resort package). Pilot sub-chapter first, then chapter by chapter (each fully verified before the next), gated on `npm run build` + `npm run verify` green; PR strategy (one PR per topic vs. a single PR) chosen up front; old design system deleted only at the end. Encodes a visualisation decision tree (live BPMN/DMN → Excalidraw or brand-styled Mermaid → raster fallback, never Cards) and five pre-emptive build/overflow lessons from a real eight-topic migration. `reference/` ships the mapping-table template, a build/overflow lessons doc, and six repo-agnostic scripts adapted from a real migration: deck scaffolder (`new-topic-deck.sh`), old-side enumerator, new-side leftover-report, Excalidraw-exporter bootstrap, inline-SVG rasteriser, and a slide screenshot + overflow probe.

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
