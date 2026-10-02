# felix-felicis

A Claude Code plugin for everyday automation tasks.

## Skills

Each skill's full behaviour is documented in its [`skills/<name>/SKILL.md`](./skills).

### `/maturity-analysis`

Analyzes the current repo end to end and reports a project overview, the key files, a maturity assessment across six dimensions, and a prioritized issue list.

### `/pin-github-actions`

Checks that every GitHub Actions `uses:` reference is pinned to a full commit SHA, reports the unpinned ones, and optionally rewrites them to SHA + version comment.

### `/pin-node-dependencies`

Checks that every `package.json` dependency is pinned to an exact version and the lockfile is committed, optionally rewrites ranges to exact pins, and adds a CI guardrail.

### `/portless-dev-setup`

Sets up [portless](https://portless.sh) for stable, worktree-aware `.localhost` dev URLs on the JS/TS frontend dev server and wires it into Conductor.

### `/conductor-setup`

Writes a repo's `.conductor/settings.toml`: a setup script, a menu of selectable run targets instead of one auto-starting script, and an archive script for cleanup.

### `/make-me-awesome [REPO_TO_PROMOTE] [AWESOME_LIST_REPO]`

Researches a GitHub repo, picks the best-fit category in an awesome list, and submits it as a PR or issue after you confirm.

### `/outlook-invitation`

Creates a German Outlook meeting invitation with context, goals, and agenda, ready to copy-paste. On macOS it can also auto-fill a new Outlook event.

### `/create-github-ticket`

Creates or updates a GitHub issue (bug, feature, or refactor) via `gh`, using the repo's issue templates and confirming the draft with you before writing.

### `/contributor-setup`

Creates or updates what a repo is missing for contributors: issue templates, README, `CONTRIBUTING.md`, and the other community-health files.

### `/medium-publish`

Copies a Markdown blog post to the clipboard as rich text and opens Medium's editor so you paste it with ⌘V (macOS). Images become placeholders.

### `/bpmn-export`

Exports a BPMN file to an image (SVG, PNG, or PDF) using `npx bpmn-to-image`.

## Beta Skills

New skills that are not yet battle-tested on real repos — expect rough edges and review their output more carefully.

### `/optimize-github-actions`

Finds wasted CI runs in GitHub Actions — duplicate PR runs, matrix job explosion, missing concurrency — and fixes trigger scoping without breaking required status checks.

### `/dependabot-setup`

Audits or sets up `.github/dependabot.yml` with a grouping mode (low-noise, balanced, or fine-grained) recommended from the repo's use-case. Flags unpinned versions first and offers to pin them.

### `/branch-ruleset-setup`

Creates or updates a GitHub ruleset protecting the default branch: no deletion or force-push, linear history, signed commits, PR-only changes, and a required CI check.

### `/automerge-setup`

Sets up or audits GitHub PR auto-merge for Dependabot, Renovate, or other bot PRs, and limits what gets auto-merged to what the repo's CI actually proves.

### `/release-please-setup`

Sets up release-please as a single or per-module release, audits an existing setup, or switches release forms without breaking tag and changelog history.

### `/secure-publish-setup`

Sets up tokenless npm publishing via OIDC trusted publishing: no `NPM_TOKEN` secret, automatic provenance attestations, and a publish step that is safe to re-run.

### `/release-audit`

Audits release and supply-chain readiness against a gold-standard reference and returns a prioritized action plan, with fixes delegated to the matching setup skills.

### `/svg-to-png`

Renders an SVG to a PNG locally with the [`resvg`](https://github.com/linebender/resvg) CLI, with optional scaling, DPI, background, or crop. Other raster formats go through a PNG intermediate.

### `/pull-request-description`

Drafts a Conventional-Commit title and a compact body that links its issue, following the repo's own conventions and template, then creates or updates the PR/MR via `gh` or `glab`.

### `/translate-post`

Translates a blog post into a language you choose, then loops a fresh reviewer agent over it until it reads as if written in that language. Can also polish an existing translation.

### `/guardrails-setup`

Adds automated quality gates (architecture rules, raise-only coverage, shrink-only debt lists) sized to the repo, so AI agents can change code safely. Can also audit existing gates.

### `/slidev-toolkit-migration`

Migrates an existing [Slidev](https://sli.dev) deck onto the [Miragon slidev-toolkit template](https://github.com/Miragon/slidev-deck-template), slide by slide, with each chapter built and verified before the next.

### `/dependency-update-shepherd`

Gets red or stale Renovate/Dependabot PRs/MRs mergeable without asking you: fixes the root-cause CI failure or holds the offending bump back. Merges only on request.

### `/clockify`

Reads and books [Clockify](https://clockify.me) time entries and timers via its REST API, previewing every write for your confirmation. Needs the `CLOCKIFY_*` env vars; times are Europe/Berlin.

## Rules

The following rules are bundled as plugin commands and auto-activate when you work on matching file types.

### Kotlin Code Style (`**/*.kt`)

Enforces collection literal formatting (one element per line when multi-line) and prefers function-body style over expression-body style for multi-line functions.

### TypeScript Code Style (`**/*.ts`, `**/*.tsx`)

Enforces descriptive variable naming conventions (no abbreviations).

### package.json Version Pinning (`**/package.json`)

Enforces exact/fixed dependency versions — no `^`, `~`, or other ranges.

## License

MIT
