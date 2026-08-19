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

### `/create-github-ticket`

Creates or updates a GitHub issue — feature request, bug report, or refactor task — using the `gh` CLI. Detects create vs. update mode from your input, optionally researches unfamiliar libraries or APIs with WebSearch/WebFetch, discovers the repo's `.github/ISSUE_TEMPLATE/` forms (in the current or a referenced repo) and falls back to bundled default templates, drafts the title and body, confirms with you before writing, then creates or edits the issue and reports the final state with its URL.

### `/contributor-setup`

Analyzes a repo's contributor experience and creates or updates what's missing: GitHub issue-form templates (bug / feature / refactor), an open-source, target-group-focused README, `CONTRIBUTING.md`, and the remaining community-health files (PR template, `CODE_OF_CONDUCT`, `SECURITY`, `LICENSE`, `CODEOWNERS`).

### `/medium-publish`

Publishes a Markdown blog post to Medium via a temporary GitHub Gist import (macOS): transforms headings to bold, creates a Gist, copies its URL to the clipboard, and opens Medium's import page for you to finish manually.

### `/bpmn-export`

Exports a BPMN file to an image (SVG, PNG, or PDF) using `npx bpmn-to-image`, with output placed under the module's `assets/` directory.

## Beta Skills

New skills that are not yet battle-tested on real repos — expect rough edges and review their output more carefully.

### `/optimize-github-actions`

CI run-efficiency audit for GitHub Actions: detects duplicate PR runs from the `push` + `pull_request` double-trigger (which concurrency groups can't dedupe — the two events run under different refs), job explosion via matrix expansion, missing or miswired `concurrency`, noisy `pull_request` types, and merge-gate traps (`paths:`-filtered required checks that stay pending forever). Gathers live evidence via `gh` (duplicate check names, run events, rulesets) with a static-only fallback, reports findings with severity and a concrete minutes-savings estimate, and only then fixes trigger scoping — gated on verifying that every required status check is still produced afterwards (merge queues and `merge_group` included), never touching tag-only push triggers, `pull_request_target`, or deploy-workflow cancellation.

### `/dependabot-setup`

Collaborative Dependabot audit & setup with three grouping modes — **low-noise** (one PR per ecosystem, or one repo-wide PR via multi-ecosystem groups; for templates and internal tooling), **balanced** (minor+patch grouped, one PR per major; for open-source and production repos), and **fine-grained** (family groups for large or conflict-prone dependency trees and monorepos) — plus a **stack-groups** variant that bundles ecosystems that move together (e.g. backend deps + the docker/compose images they run on) into one PR per stack. Recommends a mode from the repo's use-case — open-source vs internal, what it ships and to whom, CI safety net, dependency count — with past Dependabot PR history used only to fine-tune cadence and cooldown, confirms decisions interactively, cleans dead config (removed `reviewers` key, redundant `target-branch`, duplicate blocks, nonexistent labels), prefers CODEOWNERS over `assignees` for small teams, groups security updates, enforces cooldown, and gates setup on pinned dependency versions — delegating fixes to `/pin-github-actions` and `/pin-node-dependencies` before any config is written.

### `/branch-ruleset-setup`

Sets up an idempotent GitHub branch ruleset on the default branch via `gh api`: no deletion, no force-push, linear history, signed commits, PR-only changes, and a required CI status check whose `integration_id` is resolved dynamically instead of hardcoded.

### `/automerge-setup`

The single source of truth for GitHub PR auto-merge — detects, audits, and optimizes an existing setup or creates one from scratch, across three strategies: **Dependabot** (the default — a `dependabot/fetch-metadata` workflow that auto-merges patch/minor and leaves every major manual), **Renovate** (its native `automerge` + `platformAutomerge`, no second workflow to maintain), and **generic bot** (actor + eligibility label, with the caveat that without `fetch-metadata` it can't tell a patch from a major). Treats the two safety preconditions as a gate, not a suggestion: the native *Allow auto-merge* repo setting must be on (or `gh pr merge --auto` just fails) and a required-status-check ruleset must gate the default branch (or "auto" means "immediately" and CI never holds the PR) — delegating the ruleset to `/branch-ruleset-setup`. Audits catch drift, most notably a single-shot `gh pr merge --auto` missing the retry loop that rides out the UNSTABLE merge-state race. Owns the auto-merge workflow templates that `/dependabot-setup` previously carried and delegates SHA-pinning to `/pin-github-actions` and runtime merging of already-open PRs to `/dependency-update-shepherd`.

### `/release-please-setup`

Sets up, audits, **or** optimizes release-please. On a greenfield repo it creates the config + manifest + workflow (GitHub App token auth, never the default `GITHUB_TOKEN`), scoped to one of three release forms chosen interactively — single release, per-module dependency-aware, or per-module self-contained — each with a ready-to-copy template and reference repos. On a repo that already has release-please it audits instead: mainly judging whether the setup still makes sense (is the release form still right for today's topology? does PR-title validation match the merge strategy? is publishing wired? is auth still best-practice?), and along the way catching mechanical drift (`extra-files` paths that no longer resolve — the silent version-stranding bug — forgotten packages, versions out of sync with the manifest). Changes are resolved through `AskUserQuestion`, never a silent rewrite, with deliberate conventions left alone.

### `/secure-publish-setup`

Tokenless npm publishing via OIDC trusted publishing: no `NPM_TOKEN` secret, automatic provenance attestations, an idempotent skip-if-already-published step, GitHub Environments for any unavoidable long-lived secrets, and a bundled one-time check that verifies each package's `repository` field at setup so provenance publishing can't fail with E422.

### `/release-audit`

Orchestrator: evidence-based release & supply-chain readiness audit with an adversarial review subagent. Grades versioning, secure publishing, CI, PR validation, and supply-chain hardening against a gold-standard reference and delegates fixes to the matching setup skills.

### `/svg-to-png`

Renders an SVG to a PNG **locally** with the [`resvg`](https://github.com/linebender/resvg) CLI — no uploading the file to a web converter and downloading the result. Checks the precondition (`resvg --version`, installable via `brew install resvg`), derives the output path from the source basename, and reaches for scaling (`-z`), exact dimensions (`-w`/`-h`), print DPI (`--dpi`), a solid `--background` for transparency, tight-bounds crop (`--export-area-drawing`), or single-element export (`--export-id`) as the request calls for — with a font-loading fallback (`--use-font-file` / `--use-fonts-dir`) when SVG text renders wrong. resvg writes PNG only, so for a JPG/TIFF/GIF target it converts the rendered PNG with the macOS built-in `sips` (or `cwebp` for WebP); it does **not** trace raster back into SVG.

### `/pull-request-description`

Drafts a consistent pull-request / merge-request title and body, then creates or updates it via `gh` (GitHub) or `glab` (GitLab). The title defaults to a Conventional Commit but respects repo-defined types and scopes when present (commitlint, release-please packages, `amannn/action-semantic-pull-request`, or `CONTRIBUTING.md`). The body follows the repo's own PR/MR template if it has one, otherwise a bundled compact default — **Why** → **What** → **Verification**, with the issue link as the last line — plus only-when-relevant sections for breaking changes and follow-ups. Discovers the issue the change builds on (from the branch name, commits, or you) and links it with the correct closing or reference keyword. Shows the full draft for confirmation before writing anything.

### `/translate-post`

Translates a blog post or article into a target language **you specify** so it reads as if it were written in that language, not translated into it — no fixed repo structure required: you supply the input file and the target language. Preserves code blocks, URLs, and product/pattern names verbatim, and applies a whiteboard test to decide which technical terms stay in their original form. Then it loops a **fresh, isolated native-speaker reviewer** over the text (a new agent each round, never primed with prior findings; 5-round safety cap) — flagging source-language interference, calques, broken ellipses, wrong loanword gender, and over-localized terms — applies the fixes, and finishes with a faithfulness check against the source so meaning never drifts. Also runs the nativeness loop on its own against a file already in the target language.

### `/guardrails-setup`

Introduces and maintains machine-checkable guardrails (fitness functions) so AI agents can work safely in a repo — grounded in Robert C. Martin's ("Uncle Bob") position that humans should manage AI-written code through measurements, not line-by-line review: every important architecture or quality rule needs an automated gate, or the honest admission that it is not binding. Three modes: **`audit`** (read-only gap report against the repo's tier — existing gates with evidence, bypassable gates with the cheapest bypass named, higher-tier gates listed as "not recommended, and why"), **`setup`** (Phase 0 baseline → the plan is challenged by three persona subagents — a skeptical staff engineer, an AI agent hunting the cheapest bypass, a maintainer six months later — then approved per phase, one PR per phase), and **`phase <n>`** (implement one phase from the committed plan in `docs/guardrails/baseline.md`). Right-sized via a T1–T4 tier matrix so a 2-person tool doesn't get the 14-gate program; all ratchet state lives in one `guardrails/ratchets.json` watched by a self-protecting diff gate (raise-only thresholds, shrink-only debt/exclusion lists, grow-only tested surfaces, guardrail-path edits gated); exactly one exception path — a human-applied PR label, CI-checked, CODEOWNERS-backed via `/branch-ruleset-setup`. Every gate is negative-tested with the red output documented in the PR. The bundled playbook covers phases 0–5 (architecture & pattern gates, ratchets, mutation testing, dead code, fitness report, contract snapshots, error-path/anti-erosion/flakiness gates, tiered `verify`/`verify:full`), starting thresholds, a tool map for TS/Java-Kotlin/Python/Go, and eight known pitfalls.

### `/slidev-toolkit-migration`

Migrates an existing [Slidev](https://sli.dev) presentation onto the [Miragon slidev-toolkit template](https://github.com/Miragon/slidev-deck-template) (`@miragon/slidev-toolkit`). The target is fixed and the skill knows it; the source deck varies (its own theme/components, or plain markdown) and is detected in Phase 0. Deterministic where mechanical, hand-done where semantic: **scripts** clone and read the template, scaffold one deck per topic (toolkit pinned from npm, never vendored), enumerate slides with `@slidev/parser` (never regex), move assets into `resources/`, and report leftover raw-HTML / old components; the **per-slide translation** (component→component, raw HTML out, prose→bullets, overflow-split) is deliberate handwork guided by a source→toolkit **mapping table** — no auto-transform that produces garbage. Migrates a pilot sub-chapter first to validate the pipeline, then works chapter by chapter (each fully verified before the next), gated on `npm run build` + `npm run verify` green per chapter; the PR strategy — one PR per topic or the whole migration in a single PR — is chosen up front, and the old design system is deleted only at the end. A visualisation decision tree keeps diagrams in the design system (live BPMN/DMN addon → Excalidraw redraw, or a brand-styled Mermaid fence for standard text-generated graphs → raster-image fallback, never Cards), and the five hard build/overflow lessons from a real eight-topic migration (overflow is element-count not text-length, the ≥16px fit threshold, `<`+letter breaks the production build, big decks verify in halves) are baked in as pre-emptive rules. Ships six repo-agnostic scripts in `reference/`, adapted from a real migration: a deck scaffolder (`new-topic-deck.sh`), an old-side slide enumerator and a new-side leftover-report (grounded in `@slidev/parser` / the template's own rules), an Excalidraw-exporter bootstrap, an inline-SVG rasteriser, and a slide screenshot + overflow probe — plus the mapping-table template and the build/overflow lessons.

### `/dependency-update-shepherd`

Shepherds open dependency-update branches/MRs (Renovate, Dependabot, or manual) from red/stale to merged — one MR at a time, evidence-based, with hard stop rules. Freshness first: prefers the bot's own rebase (`@dependabot rebase`, Renovate's checkbox) and treats a manual push as a deliberate takeover that permanently ends bot maintenance — after which bot rebase is forbidden (it would wipe the fix commits). Then finds the **first causal** CI failure (GitHub via `gh`, GitLab via MR pipelines — `glab ci get --merge-request`), classifies it (code incompatibility, test, lint, infra, missing secret, transient — with one flaky rerun per MR, total), reproduces and fixes it locally with a minimal adaptation, verifies, pushes with `--force-with-lease` pinned to the base SHA, and watches the pipeline of **its own** push. Guardrails throughout: candidates are authenticated by verified bot identity (a branch merely *named* `renovate/…` is not trusted), lockfiles are regenerated conservatively and diffed against the bot's original (any extra package/`resolved`/`integrity` change stops the run), a 3-iteration cap, and a merge gate re-checked fresh — merging and MR writes need explicit opt-in, agent-authored code fixes need a fresh per-diff confirmation, and major-equivalents (majors, `0.x` minors, SHA/digest pins) are never auto-merged unless named. Ends with a per-MR report that states plainly what was **not** verified.

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
