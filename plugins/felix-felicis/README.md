# felix-felicis

A Claude Code plugin for everyday automation tasks.

## Skills

### `/maturity-analysis`

Performs an end-to-end analysis of the current repository and delivers a structured Markdown report covering: project overview (problem, users, data flow, core abstractions), most important files, maturity assessment across six dimensions (documentation, dev tooling, tests, clean code, agent-skills, pipelines) using parallel expert subagents that benchmark against reference projects, and a prioritized issues list.

### `/pin-github-actions`

Supply-chain audit of GitHub Actions: verifies every `uses:` reference is pinned to a full commit SHA (not a mutable `@v4` tag or `@main` branch), reports unpinned references with `file:line` evidence and severity, optionally rewrites them to SHA + version comment, and recommends Dependabot/Scorecard enforcement.

### `/pin-node-dependencies`

Supply-chain audit of Node.js (js/ts) dependencies: verifies every `package.json` spec is pinned to an exact version (no `^`/`~`/`>=`/`*`/`latest`/mutable git refs), checks the lockfile is committed, optionally rewrites ranges to exact pins with `save-exact`, and wires up the `Miragon/pin-npm-dependencies` CI guardrail plus Dependabot cooldown.

### `/portless-dev-setup`

Adopts [portless](https://portless.sh) for stable, git-worktree-aware `.localhost` dev URLs following its documented best practices — pinned devDependency, explicit `portless.json`, and a `dev`/`dev:app` script split (never a hand-rolled slug or `sh -c` wrapper) — then wires it into Conductor via `.conductor/settings.toml`. Detects the stack first, wraps only the JS/TS frontend dev server, and researches per-workspace isolation (`CONDUCTOR_PORT`, `COMPOSE_PROJECT_NAME`, `portless alias`, …) for the backends, databases, and Docker stacks portless can't cover. Stages edits and shows the diff without committing.

### `/conductor-setup`

Sets up a repo's full Conductor workspace lifecycle in `.conductor/settings.toml` (or the personal, gitignored `settings.local.toml`): a **setup** script for installs, a menu of selectable, icon-labelled **run** targets with autostart off (instead of one auto-starting script), and an **archive** script to tear down external resources — Docker containers, cloud sandboxes, reserved ports — before a workspace is removed. Discovers real commands from `package.json`/`Makefile`/README, confirms every choice interactively, and never overwrites an existing script without asking.

### `/make-me-awesome [REPO_TO_PROMOTE] [AWESOME_LIST_REPO]`

Analyzes a GitHub repository and adds it to an awesome list by submitting a PR or issue. Researches the repo, identifies the best-fit category, drafts the entry and submission body, confirms with you, then opens the PR or issue automatically.

### `/outlook-invitation`

Creates a professional German Outlook meeting invitation with context, goals, agenda, and emojis — ready to copy-paste or auto-fill into a new calendar event (macOS auto-fill requires Terminal accessibility permission).

## Beta Skills

New skills that are not yet battle-tested on real repos — expect rough edges and review their output more carefully.

### `/dependabot-setup`

Collaborative Dependabot audit & setup with three grouping modes — **low-noise** (one PR per ecosystem, or one repo-wide PR via multi-ecosystem groups; for templates and internal tooling), **balanced** (minor+patch grouped, one PR per major; for open-source and production repos), and **fine-grained** (family groups for large or conflict-prone dependency trees and monorepos) — plus a **stack-groups** variant that bundles ecosystems that move together (e.g. backend deps + the docker/compose images they run on) into one PR per stack. Recommends a mode from the repo's use-case — open-source vs internal, what it ships and to whom, CI safety net, dependency count — with past Dependabot PR history used only to fine-tune cadence and cooldown, confirms decisions interactively, cleans dead config (removed `reviewers` key, redundant `target-branch`, duplicate blocks, nonexistent labels), prefers CODEOWNERS over `assignees` for small teams, groups security updates, enforces cooldown, and gates setup on pinned dependency versions — delegating fixes to `/pin-github-actions` and `/pin-node-dependencies` before any config is written.

### `/branch-ruleset-setup`

Sets up an idempotent GitHub branch ruleset on the default branch via `gh api`: no deletion, no force-push, linear history, signed commits, PR-only changes, and a required CI status check whose `integration_id` is resolved dynamically instead of hardcoded.

### `/release-please-setup`

Sets up, audits, **or** optimizes release-please. On a greenfield repo it creates the config + manifest + workflow (GitHub App token auth, never the default `GITHUB_TOKEN`), scoped to one of three release forms chosen interactively — single release, per-module dependency-aware, or per-module self-contained — each with a ready-to-copy template and reference repos. On a repo that already has release-please it audits instead: mainly judging whether the setup still makes sense (is the release form still right for today's topology? does PR-title validation match the merge strategy? is publishing wired? is auth still best-practice?), and along the way catching mechanical drift (`extra-files` paths that no longer resolve — the silent version-stranding bug — forgotten packages, versions out of sync with the manifest). Changes are resolved through `AskUserQuestion`, never a silent rewrite, with deliberate conventions left alone.

### `/secure-publish-setup`

Tokenless npm publishing via OIDC trusted publishing: no `NPM_TOKEN` secret, automatic provenance attestations, an idempotent skip-if-already-published step, and GitHub Environments for any unavoidable long-lived secrets.

### `/release-audit`

Orchestrator: evidence-based release & supply-chain readiness audit with an adversarial review subagent. Grades versioning, secure publishing, CI, PR validation, and supply-chain hardening against a gold-standard reference and delegates fixes to the matching setup skills.

### `/create-github-ticket`

Creates or updates a GitHub issue — feature request, bug report, or refactor task — using the `gh` CLI. Detects create vs. update mode from your input, optionally researches unfamiliar libraries or APIs with WebSearch/WebFetch, discovers the repo's `.github/ISSUE_TEMPLATE/` forms (in the current or a referenced repo) and falls back to bundled default templates, drafts the title and body, confirms with you before writing, then creates or edits the issue and reports the final state with its URL.

## Rules

The following rules are bundled as plugin commands and auto-activate when you work on matching file types.

### BPMN Image Export (`**/*.bpmn`)

Instructs Claude to use `npx bpmn-to-image` when generating images from BPMN files, with output placed under the module's `assets/` directory.

### Kotlin Code Style (`**/*.kt`)

Enforces collection literal formatting (one element per line when multi-line) and prefers function-body style over expression-body style for multi-line functions.

## License

MIT
