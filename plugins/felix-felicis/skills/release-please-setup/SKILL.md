---
name: release-please-setup
description: "Sets up, audits, or migrates release-please (Conventional-Commit versioning, changelogs, GitHub releases). Use to set up release automation, automated versioning/changelogs, or release-please; to audit, review, fix, or question an existing setup; or to switch release forms (single ↔ per-module) without breaking changelog/tag history."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, AskUserQuestion
---

# Skill: release-please-setup

Sets up, audits, **or** optimizes [release-please](https://github.com/googleapis/release-please): parses Conventional Commits on the default branch, maintains a rolling **Release PR** (version bump + CHANGELOG), cuts the GitHub release + tag on merge.

Run this for "set up release automation" / release-please, to audit/review/fix an existing setup, or as the versioning slice of a release/supply-chain audit (sibling skill **`release-audit`**).

**Phase 0 always runs first — detect, then branch.** Never assume greenfield; never conclude "already configured" without running Phase 8.

- **Setup mode** (nothing found): Phases 1–7 build config, manifest, workflow, and PR validation from templates.
- **Audit mode** (already present): Phase 8 — question whether the setup still makes sense (form, validation, publishing, auth), then catch mechanical drift. Resolve every change via `AskUserQuestion`; Phases 1–6 are the reference for what "correct" looks like.

## Phase 0 — Detect existing setup

```bash
ls release-please-config.json .release-please-manifest.json 2>/dev/null
ls .github/workflows/ 2>/dev/null | grep -iE 'release' || true
grep -rl 'release-please-action' .github/workflows/ 2>/dev/null || true
```

- **Nothing found** → setup mode: Phase 1, then Phases 1–7.
- **Config, manifest, or workflow found** → audit mode: don't overwrite anything up front, go to **Phase 8** (re-run Phase 1 there for today's topology).

A partial install (config but no workflow, workflow but no manifest) is itself a finding — raise the missing piece as a decision in audit mode, don't silently regenerate the stack.

## The three release forms

release-please can be scoped three ways. The wrong pick floods the repo with irrelevant tags (over-scoped) or silently misses changes (under-scoped) — a product decision, not a technical default. **Never pick silently; confirm with `AskUserQuestion` (Phase 2)** before writing any file.

| Form                                 | Behavior                                                                                                                                          | Choose when                                                                                    | Template                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **A — Single release**               | One Release PR, one tag, one CHANGELOG for the whole repo. Internal packages (if any) still bump their own `package.json`/manifest, but in lockstep. | Everything ships as one product/artifact; a change anywhere is "one release" for the consumer. | `reference/config-single-release.json`                          |
| **B — Per-module, dependency-aware** | One release line (tag `<component>-vX.Y.Z`, own CHANGELOG) per module. A module that depends on another gets an automatic patch release when that dependency releases — even with no code change of its own. | Modules are consumed independently **and** depend on each other (an npm/cargo/maven workspace). | `reference/config-per-module-dependency-aware.json` (+ `.rust.json` / `.maven.json`) |
| **C — Per-module, self-contained**   | One release line per module, same as B, but modules don't depend on each other — nothing to auto-propagate.                                          | Modules are consumed independently and are self-contained (e.g. plugins in a marketplace).      | `reference/config-per-module-independent.json`                  |

Form B and C look identical in config until you check for internal dependencies — that's exactly what Phase 1 does. Verified examples for all three forms are in `reference/examples.md` — pull one up when explaining a form, it lands better than the abstract table.

## Phase 1 — Map the repo topology

Gather evidence before asking anything — aim for a *recommendation*, not a decision:

1. **Ecosystem & `release-type`:** `package.json` → `node`, `Cargo.toml` → `rust`, `pom.xml` → `java`/`maven`; nothing native → `simple` (versions bumped via `extra-files`). Full list in [customizing.md](https://github.com/googleapis/release-please/blob/main/docs/customizing.md) (`python`, `go`, etc.).
2. **Single package vs. multi-module:** `workspaces` in a root `package.json`, a Cargo workspace, multiple Maven modules, or self-contained manifests/plugins under a shared parent (e.g. `plugins/*`, `packages/*`).
3. **If multi-module, check for *internal* cross-dependencies** — this decides B vs. C, don't skip it:
   - Node: does a workspace package's `dependencies`/`peerDependencies` reference another workspace package's `name`?
   - Rust: does a crate's `Cargo.toml` have a `path = "../other-crate"` dependency on another member?
   - Maven: does a module's `pom.xml` `<dependency>` reference a sibling module's `artifactId`?
   - Anything else (e.g. `release-type: simple`, like this marketplace's `plugins/*`): no workspace plugin exists (Form B caveat in `reference/examples.md`) — a hand-maintained dependency graph won't auto-trigger releases. Flag this instead of proposing Form B.

Turn that into a proposal — ecosystem, single vs. multi-module, and (if multi-module) which form fits — then hold off on writing anything until Phase 2.

## Phase 2 — Confirm the form with the user

The collaboration step the rest of the skill depends on. Present Phase 1's evidence in plain language (module count, ecosystem, cross-module dependencies found or their absence) plus your recommendation, then ask — don't assume silence means agreement on a multi-module repo:

- Ambiguous structure (could read as one product or independent packages) → ask which mental model fits before proposing a form.
- Once topology is clear, ask the form question directly, e.g.:
  - *"This repo has 4 packages under `packages/*`, and `renderer` depends on `dsl` and `schema-model`. How should releases work?"*
    - `Single release — one version for the whole repo (recommended: ships as one product)`
    - `Per-module, dependency-aware — each package versions independently, dependents auto-bump when a dependency releases`
    - `Per-module, self-contained — each package versions fully independently`
- Form B picked but Phase 1 found no native workspace plugin for the ecosystem → say so, offer A or C — don't write a config that can't deliver what was asked.
- Single-package repo → Phase 1's evidence already settles it (Form A); confirm briefly, there's no real decision to make.

Do not write `release-please-config.json` or `.release-please-manifest.json` before this question is answered.

## Phase 3 — Write the config from the matching template

Copy the matching template from `reference/` to `release-please-config.json` at the repo root, then adapt it. Templates use `//` comments and `<placeholder>` tokens for readability — **strip both** before the file reaches release-please, which requires strict JSON.

- **Form A** (`config-single-release.json`): single `"."` package entry. If there are internal sub-packages, list every `version` field *and* every cross-package `dependencies` pin under that one package's `extra-files`, so one Release PR bumps all of them in lockstep.
- **Form B** — pick the template by ecosystem: `config-per-module-dependency-aware.json` (Node, `node-workspace`), `.rust.json` (Rust, `cargo-workspace`), `.maven.json` (Java/Maven, `maven-workspace`). Same shape: one `packages` entry per module path (often `{}` — the module's own manifest already has what the plugin needs), and the ecosystem's workspace plugin turned on in `plugins`.
- **Form C** (`config-per-module-independent.json`): one `packages` entry per module path, each with its own `component` + `include-component-in-tag: true`, `separate-pull-requests: true`, and per-module `extra-files` for any version field outside its own manifest (e.g. a plugin's `plugin.json`). No `plugins` key — no dependency graph to propagate.

### How Form B's dependency graph is actually discovered

**The config never states "module X depends on module Y."** It only lists which paths participate and turns the workspace plugin on; the plugin builds the graph by reading each module's own manifest at run time:

| Ecosystem | Plugin | Reads the graph from |
| --- | --- | --- |
| Node | `node-workspace` | each `package.json`'s `dependencies`/`devDependencies`/`peerDependencies`, matched against other workspace packages' `name` |
| Rust | `cargo-workspace` | each crate's `Cargo.toml` `path = "../other-crate"` entries |
| Java/Maven | `maven-workspace` | each module's `pom.xml` `<dependency>`/parent-module references |

Worked example (Node; same mechanic elsewhere — verified live in [graphprotocol/indexer-rs](https://github.com/graphprotocol/indexer-rs), see `reference/examples.md`): `packages/cli/package.json` depends on `@scope/core: ^1.2.0`; a `feat:` commit scoped to `packages/core` ships `core` 1.2.0 → 1.3.0. The **same Release PR** also bumps `cli` 2.0.0 → 2.0.1 and its dependency pin to `^1.3.0`, with a "Dependencies" changelog entry — even though no `cli` file changed. Propagates across major bumps by default; set `"always-link-local": false` to limit it to within-semver-range updates.

Seed `.release-please-manifest.json` with the versions currently in the manifests:

```json
{ ".": "1.4.0" }                                          // Form A: single root entry
{ "packages/a": "0.7.1", "packages/b": "0.2.0" }          // Form B or C: one entry per module path
```

## Phase 4 — Release workflow with a GitHub App token

**The most-overlooked gotcha:** PRs and commits made with the default `GITHUB_TOKEN` [do not trigger further workflow runs](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow) — the Release PR would sit with no CI, unmergeable behind any required check. release-please must authenticate with a **GitHub App token**, never `GITHUB_TOKEN` (a PAT works but is a long-lived personal credential — the app is best practice). Bonus: app commits are signed by GitHub, so they pass a `required_signatures` ruleset (see **`branch-ruleset-setup`**).

One-time app setup (walk the user through it):

1. Create a GitHub App (org or user scope): only **Repository permissions** `Contents: Read and write` + `Pull requests: Read and write`, no webhook.
2. Install it on the target repo.
3. Store the app's **Client ID** as a repo **variable** `RELEASE_PLEASE_APP_CLIENT_ID` and the generated private key as a **secret** `RELEASE_PLEASE_APP_PRIVATE_KEY`. Use the Client ID, not the numeric App ID — GitHub recommends it, and the action's `app-id` input is legacy.

`.github/workflows/release-please.yml` (SHA-pin the actions — resolve current SHAs fresh via `gh api repos/<owner>/<repo>/commits/<tag> --jq .sha`, see **`pin-github-actions`**; the SHAs below were current for v3.2.0 / v5.0.0 as of 2026-07):

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    outputs:
      releases_created: ${{ steps.release_please.outputs.releases_created }}
    steps:
      - uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0
        id: app-token
        with:
          client-id: ${{ vars.RELEASE_PLEASE_APP_CLIENT_ID }}
          private-key: ${{ secrets.RELEASE_PLEASE_APP_PRIVATE_KEY }}
      - id: release_please
        uses: googleapis/release-please-action@45996ed1f6d02564a971a2fa1b5860e934307cf7 # v5.0.0
        with:
          token: ${{ steps.app-token.outputs.token }}
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
```

## Phase 5 — Conventional Commits prerequisite

release-please only sees what lands on the default branch. **Squash-merge repos**: the PR title becomes the commit message, so validate titles with [amannn/action-semantic-pull-request](https://github.com/amannn/action-semantic-pull-request) (own workflow, `pull_request` trigger, `permissions: pull-requests: read`). **Merge/rebase repos**: enforce commit messages instead (e.g. commitlint). Ask the user which merge strategy applies — a repo setting, not something to infer from the config.

Form B/C: remind the user Conventional Commit **scopes** should match `component` names (e.g. `fix(core): ...` for `packages/core`) so changes land in the right module's changelog — release-please falls back to path-based detection otherwise, but an explicit scope is more reliable in a fast-moving monorepo.

## Phase 6 — Wire up publishing

**Ask whether the repo publishes artifacts** (npm, marketplace, container) before adding this — not every repo needs it. If it does, chain publish jobs on the release job's output, and delegate tokenless npm publish to the sibling skill **`secure-publish-setup`**:

```yaml
publish:
  needs: release-please
  if: needs.release-please.outputs.releases_created == 'true'
  permissions:
    contents: read
    id-token: write
  uses: ./.github/workflows/publish-npm-package.yml
```

For Form B/C, `releases_created` is a map keyed by component path — gate each module's publish job on its own key (e.g. `fromJSON(needs.release-please.outputs.releases_created)['packages/core']`) rather than the top-level output.

## Phase 7 — Verify

- [ ] Workflow YAML parses; actions SHA-pinned; `vars.RELEASE_PLEASE_APP_CLIENT_ID` / secret exist (`gh variable list`, `gh secret list`)
- [ ] Merge a `feat:`/`fix:` commit to main → a Release PR appears with the correct version bump and CHANGELOG entry, **and CI runs on it** (the app-token proof)
- [ ] Merge the Release PR → GitHub release + tag created; manifest updated
- [ ] **Form A:** every `extra-files` path (including cross-package dependency pins) was bumped in the same Release PR
- [ ] **Form B:** a change scoped to only one module produces a Release PR, tag, and CHANGELOG for that module; then confirm a change to a module it *depends on* produces a follow-up patch release for the dependent too, with no code change of its own
- [ ] **Form C:** a change scoped to one module produces a Release PR, tag, and CHANGELOG for that module only — and a change to an unrelated module does **not** touch it

## Phase 8 — Audit an existing setup

Mainly judging **whether the setup still makes sense** — fixing drift is secondary. Two kinds of finding, plus an interactive close. Cite evidence (`path:line`, config key, command output) for each.

- **Decisions** (the main pass) — does the *design* still fit today's repo? Raise via `AskUserQuestion`; never change unilaterally.
- **Defects** — mechanical drift that silently breaks releases. Fix these.
- **Observations** — a deliberate choice (check git history first); note it, don't rewrite.

### 8A — Does the setup still make sense? (decisions)

Re-run **Phase 1** on the repo as it is today, then question each design choice. Divergences are the highest-value thing this audit finds — raise via `AskUserQuestion` like the Phase 2 form choice:

- **Release form vs. topology:** Form A but packages now consumed independently → B/C? Form C but packages now depend on each other → B (won't auto-bump otherwise)? Form B but no workspace plugin for the ecosystem (Form B caveat in `reference/examples.md`) → graph isn't propagating, A or C? A new top-level package/app no form covers?
- **Validation vs. merge strategy:** check the *current* strategy (`gh api repos/{owner}/{repo} --jq '{squash:.allow_squash_merge,merge:.allow_merge_commit,rebase:.allow_rebase_merge}'`). Squash-merge with no PR-title validation → offer `amannn/action-semantic-pull-request`; a title validator left in place after squash was disabled → switch to commit-message linting.
- **Publishing:** ships artifacts (npm/marketplace/container) but the workflow stops at the tag (no publish job gated on `releases_created`, Phase 6) → wire it via **`secure-publish-setup`**.
- **Auth:** a PAT instead of a GitHub App token works but is a long-lived personal credential → offer migration (Phase 4). A deliberately-kept PAT is an observation.
- **Scopes (Form B/C):** spot-check recent commits — `fix(core):` scopes should match `component`/path names.

**Respect deliberate choices.** If git history shows a convention was intentional — tag-pins instead of SHAs (`pin-github-actions` would tighten it), custom secret names, a chosen merge strategy, a kept PAT — record it as an observation, don't impose this skill's defaults.

### 8B — Mechanical drift (defects)

Each is a silent-breakage bug:

1. **Every `extra-files` path resolves.** release-please silently ignores a path it can't find, so a renamed package (e.g. `packages/workspace-mcp` → `packages/repository-mcp`) falls out of the release and strands at its old version with no error. The motivating failure for this whole mode.
2. **Every workspace package is tracked** — Form A: its `version` (+ cross-package pins) under `extra-files`; Form B/C: a `packages` + manifest key. A member on disk but absent from config silently fell out; a config path with no package on disk was renamed/deleted.
3. **Versions agree** — Form A: all tracked `version` fields equal each other and the manifest `"."`; Form B/C: each manifest entry equals that package's own `version`.
4. **Config + manifest are strict JSON** (no leftover `//` comments/trailing commas) with matching keys.
5. **Credentials exist** at repo **or org** scope (check both; org 403 = *unverified*, not missing).
6. **Workflow uses the App token**, not `GITHUB_TOKEN`.

Node repos — this one-liner covers 1–4 (walks `extra-files` + `packages`, asserts each path exists, diffs versions against the manifest; adapt filenames for Rust `Cargo.toml` / Maven `pom.xml`):

```bash
node -e '
const fs = require("fs");
const cfg = JSON.parse(fs.readFileSync("release-please-config.json", "utf8"));
const man = JSON.parse(fs.readFileSync(".release-please-manifest.json", "utf8"));
const problems = [];
const readVersion = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")).version; } catch { return undefined; } };
const collectExtra = (obj) => Object.values(obj?.packages ?? {}).concat(obj)
  .flatMap((pkg) => (pkg?.["extra-files"] ?? []).map((e) => (typeof e === "string" ? e : e.path)))
  .filter(Boolean);
for (const p of collectExtra(cfg)) if (!fs.existsSync(p)) problems.push(`extra-files path missing: ${p}`);
for (const path of Object.keys(cfg.packages ?? {})) {
  if (path !== "." && !fs.existsSync(path)) problems.push(`packages path missing: ${path}`);
  if (!(path in man)) problems.push(`config package not in manifest: ${path}`);
}
for (const path of Object.keys(man)) if (!(path in (cfg.packages ?? {}))) problems.push(`manifest key not in config: ${path}`);
for (const [path, v] of Object.entries(man)) {
  if (path === ".") continue;
  const real = readVersion(`${path}/package.json`);
  if (real && real !== v) problems.push(`version drift ${path}: manifest ${v} vs package.json ${real}`);
}
console.log(problems.length ? problems.map((p) => "✗ " + p).join("\n") : "✓ config/manifest consistent");
'
```

Credentials (5) and workflow auth (6):

```bash
gh variable list; gh secret list                       # repo scope
ORG=$(gh repo view --json owner --jq .owner.login)     # org scope — empty repo output ≠ missing
gh api "/orgs/$ORG/actions/variables" --jq '.variables[].name' 2>/dev/null || true
grep -nE 'create-github-app-token|token:|GITHUB_TOKEN' .github/workflows/*.yml
```

### 8C — Resolve with the user (`AskUserQuestion`)

Audit mode never edits silently and never just prints a report. Once 8A/8B are done:

1. **Summarize** with evidence: decisions, defects, observations.
2. **Fix defects** (dangling paths, untracked packages, version/manifest mismatch, `GITHUB_TOKEN` regression), using Phases 3–6 as the reference. Ask only if the repair is itself a judgment call (e.g. *which* version an out-of-sync package should settle on).
3. **Ask one `AskUserQuestion` per decision**, phrased like the Phase 2 form choice, with a recommended option — never migrate a form, add validation, wire publishing, or change auth unpicked. E.g. *"`renderer` now depends on `dsl` but the config is Form C, so it won't auto-bump — switch to Form B?"* → `Switch to Form B` / `Keep Form C` / `Explain the tradeoff`.
4. **Apply** what was approved. If it's a **release-form switch on a repo with real release history** (at least one tag/GitHub release exists), work through **8D** before/while editing the config — a bare config swap isn't enough. Otherwise apply directly from Phases 3–6, then hand off the **Phase 7** behavioural check as the live proof. Leave observations as observations.

### 8D — Transitioning between release forms with existing release history

A form switch isn't just a config edit once a repo has shipped real releases — it changes what release-please treats as each package's release history. Skipped, this either explodes the changelog (a newly split component's first entry replays every past commit) or loses continuity (a version resets, or a merged component's history vanishes). Skip this section entirely for a repo with **no** tags/releases yet — that's just Phase 3 from scratch.

release-please finds "the last release" primarily via git tags matching its configured pattern (`<component>-vX.Y.Z`, or bare `vX.Y.Z` if `include-component-in-tag` is off), falling back to the manifest when no tag matches. A form change alters that pattern for at least one package — the exact source of the break:

1. **Check for an in-flight Release PR first.** It was generated under the old config; merge or close it before switching, or the next run mixes both schemes.
2. **Splitting a form (A → B/C, or a component newly breaking out under B):**
   - Seed each new `packages` entry / manifest key with that module's *actual last-released version* under the old scheme (its own `package.json`/`Cargo.toml`/`pom.xml`, or the old `"."` manifest entry if it moved in lockstep) — never `0.0.0`. A module starting at `0.0.0` looks unreleased and gets a "first release" changelog covering its entire history.
   - Set root-level `"bootstrap-sha"` in the config to the commit the old single tag points at (or later) — release-please's documented mechanism for where to stop walking commit history. Without it, a component whose new tag pattern has no matching prior tag falls back to walking the repo's full history and dumps everything already shipped under the old tag into its first changelog entry. It's root-only, not per-package (per release-please's `manifest-releaser.md`) — flag as a limitation if different modules need different cutoffs rather than picking one silently. Self-expiring: remove it once the first release-please PR under the new config merges.
   - The existing single `CHANGELOG.md` doesn't get split automatically — release-please only *appends* to whatever changelog path a package points at. Ask the user: leave the root `CHANGELOG.md` as a historical record and let each new module start fresh from the migration point (simplest, loses per-module "what happened before"), or manually pre-seed each new per-module `CHANGELOG.md` by copying its relevant past entries out of the root file. Never silently delete the root file.
   - Existing tags (`vX.Y.Z`) are untouched; new tags follow the new pattern. No collision, but flag it if anything downstream (deploy scripts, `git describe`, badges) parses the old tag format.
3. **Merging forms (B/C → A, components collapsing into one `"."`):**
   - The new `"."` version isn't automatically "the highest of the merged components" — ask the user which to start from (bump from the highest, or continue whichever was the de facto primary one).
   - Same `bootstrap-sha` reasoning in reverse: without it, the first Release PR under the merged config can re-walk each component's full history into the new shared `CHANGELOG.md`.
   - Ask whether to concatenate the per-module `CHANGELOG.md` histories into the new root one, or leave them as historical artifacts and start the root changelog clean.
4. **Land the migration as its own commit/PR**, separate from any 8B defect fixes — a tag/version-scheme jump is easier to audit and revert in isolation if `bootstrap-sha` or a seeded version turns out wrong.
5. Once merged, run **Phase 7** to confirm the next real change produces a correctly-scoped Release PR (right component, right starting version, changelog picking up from the intended commit — not replaying history).

## Resources

- `reference/config-single-release.json` (Form A), `reference/config-per-module-dependency-aware.json` + `.rust.json` + `.maven.json` (Form B, one per ecosystem), `reference/config-per-module-independent.json` (Form C) — copy-ready, annotated templates.
- `reference/examples.md` — real repos (Miragon, emaarco, and well-known OSS monorepos) for each form, verified against their actual `release-please-config.json`, plus the release-please plugin docs.
- release-please action: https://github.com/googleapis/release-please-action
- release-please manifest/config + plugins docs: https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md
- `GITHUB_TOKEN` does not trigger workflows: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow
- actions/create-github-app-token (`client-id` recommended, `app-id` legacy): https://github.com/actions/create-github-app-token
- GitHub App JWT authentication ("Use of the client ID is recommended"): https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app
