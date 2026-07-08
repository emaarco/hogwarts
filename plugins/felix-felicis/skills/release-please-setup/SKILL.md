---
name: release-please-setup
description: "Sets up, audits, or optimizes release-please (Conventional-Commit versioning, changelogs, GitHub releases). Fresh repo → creates the config + manifest scoped to one of three release forms, an App-token release workflow (never the default GITHUB_TOKEN), and PR-title validation. Repo that already has release-please → audits it: mainly judging whether the setup still makes sense (right release form for today's topology, PR validation matching the merge strategy, publishing, auth), and along the way catching mechanical drift (broken extra-files paths, untracked packages, versions out of sync with the manifest) — resolving changes with the user via AskUserQuestion, never a silent rewrite. Use to set up release automation, automated versioning or changelogs, or release-please — or to audit, review, question, or fix an existing setup."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, AskUserQuestion
---

# Skill: release-please-setup

Sets up, audits, **or** optimizes [release-please](https://github.com/googleapis/release-please): it parses Conventional Commits on the default branch, maintains a rolling **Release PR** (version bump + CHANGELOG), and cuts the GitHub release + tag when that PR is merged.

Run this when asked to "set up release automation" / release-please, to audit / review / question / fix an existing release-please setup, or as the versioning slice of a release/supply-chain audit (see the sibling skill **`release-audit`**).

**The first move on any repo is always Phase 0 — detect, then branch.** Never assume greenfield, and never conclude "looks configured, done" without running Phase 8.

- **Setup mode** (nothing found): run Phases 1–7 to create config, manifest, workflow, and PR validation from templates.
- **Audit mode** (release-please already present): run **Phase 8** — mainly *questioning whether the setup still makes sense* (release form, validation, publishing, auth), plus catching mechanical drift. Resolve every change with the user via `AskUserQuestion`; Phases 1–6 are the reference for what a correct file looks like.

## Phase 0 — Detect existing setup

Before anything else, check whether release-please is already installed. Run all three checks:

```bash
ls release-please-config.json .release-please-manifest.json 2>/dev/null
ls .github/workflows/ 2>/dev/null | grep -iE 'release' || true
grep -rl 'release-please-action' .github/workflows/ 2>/dev/null || true
```

- **Nothing found** → **setup mode**: Phase 1, then the full greenfield flow (Phases 1–7).
- **Config, manifest, or a release-please workflow found** → **audit mode**: don't overwrite anything up front. Go to **Phase 8** (re-run Phase 1 there to re-derive today's topology).

A partial install (config but no workflow, workflow but no manifest) is itself a finding — audit mode, raise the missing piece as a decision, don't silently regenerate the stack.

## The three release forms

release-please can be scoped three different ways. Picking the wrong one produces either
a flood of irrelevant tags (over-scoped) or version bumps that silently miss changes
(under-scoped) — so this is a product decision, not a technical default. **Never
pick silently; always confirm with the user via `AskUserQuestion` (Phase 2)** before
writing any file.

| Form                                 | Behavior                                                                                                                                          | Choose when                                                                                    | Template                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **A — Single release**               | One Release PR, one tag, one CHANGELOG for the whole repo. Internal packages (if any) still bump their own `package.json`/manifest, but in lockstep. | Everything ships as one product/artifact; a change anywhere is "one release" for the consumer. | `reference/config-single-release.json`                          |
| **B — Per-module, dependency-aware** | One release line (tag `<component>-vX.Y.Z`, own CHANGELOG) per module. A module that depends on another gets an automatic patch release when that dependency releases — even with no code change of its own. | Modules are consumed independently **and** depend on each other (an npm/cargo/maven workspace). | `reference/config-per-module-dependency-aware.json` (+ `.rust.json` / `.maven.json`) |
| **C — Per-module, self-contained**   | One release line per module, same as B, but modules don't depend on each other — nothing to auto-propagate.                                          | Modules are consumed independently and are self-contained (e.g. plugins in a marketplace).      | `reference/config-per-module-independent.json`                  |

Form B and C look identical in the config until you check for internal dependencies —
that check is exactly what Phase 1 does. Real, verified examples for all three forms
(Miragon, emaarco, and well-known OSS monorepos) are in `reference/examples.md` — pull
one up when explaining a form to the user, it lands better than an abstract table.

## Phase 1 — Map the repo topology

Gather evidence before asking anything; the goal is a *recommendation*, not a decision:

1. **Ecosystem & `release-type`:** look for `package.json` (→ `node`), `Cargo.toml` (→ `rust`), `pom.xml` (→ `java`/`maven`), or nothing release-please has a native type for (→ `simple`, versions bumped via `extra-files`). See [customizing.md](https://github.com/googleapis/release-please/blob/main/docs/customizing.md) for the full list (`python`, `go`, etc.).
2. **Single package vs. multi-module:** `workspaces` in a root `package.json`, a Cargo workspace, multiple Maven modules, or multiple self-contained manifests/plugins under a common parent directory (e.g. `plugins/*`, `packages/*`).
3. **If multi-module, check for *internal* cross-dependencies** — this is the fact that decides B vs. C, so don't skip it:
   - Node: does any workspace package's `dependencies`/`peerDependencies` reference another workspace package's `name`?
   - Rust: does any crate's `Cargo.toml` have a `path = "../other-crate"` dependency on another workspace member?
   - Maven: does any module's `pom.xml` `<dependency>` reference a sibling module's `artifactId`?
   - Anything else (e.g. `release-type: simple`, like this very marketplace's `plugins/*`): there is **no** workspace plugin release-please can use (see the Form B caveat in `reference/examples.md`) — a real dependency graph, if one exists, would have to be maintained by hand and won't auto-trigger releases. Flag this to the user instead of proposing Form B.

Work out a proposal from that evidence — ecosystem, single vs. multi-module, and (if multi-module) which form fits — but hold off on writing anything until Phase 2.

## Phase 2 — Confirm the form with the user

This is the collaboration step the rest of the skill depends on. Present the evidence
from Phase 1 in plain language (module count, detected ecosystem, any cross-module
dependencies found or their absence) and your recommendation, then ask — don't assume
silence means agreement on a multi-module repo:

- If module count / structure is ambiguous (e.g. could be read as one product or as independent packages), ask first which mental model fits before proposing a form.
- Once topology is clear, ask the form question directly, e.g.:
  - *"This repo has 4 packages under `packages/*`, and `renderer` depends on `dsl` and `schema-model`. How should releases work?"*
    - `Single release — one version for the whole repo (recommended: ships as one product)`
    - `Per-module, dependency-aware — each package versions independently, dependents auto-bump when a dependency releases`
    - `Per-module, self-contained — each package versions fully independently`
- If the user picks Form B but Phase 1 found no native workspace plugin for the ecosystem, say so explicitly and offer Form A or C as the two that actually work — don't silently write a config that can't deliver what was asked for.
- For a single-package repo, Phase 1's evidence already settles it (Form A, trivially) — confirm briefly rather than running the full question, there's no real decision to make.

Do not write `release-please-config.json` or `.release-please-manifest.json` before this question is answered.

## Phase 3 — Write the config from the matching template

Copy the matching template from this skill's `reference/` folder to `release-please-config.json` at the repo root, then adapt it to the repo. The templates use `//` comments and `<placeholder>` tokens for readability while you read/edit them — **strip both** before the file reaches release-please, which requires strict JSON.

- **Form A** (`config-single-release.json`): single `"."` package entry. If there are internal sub-packages, list every one of their `version` fields *and* every cross-package `dependencies` pin under that one package's `extra-files`, so a single Release PR bumps all of them in lockstep.
- **Form B** — pick the template matching the ecosystem: `config-per-module-dependency-aware.json` (Node, `node-workspace`), `config-per-module-dependency-aware.rust.json` (Rust, `cargo-workspace`), or `config-per-module-dependency-aware.maven.json` (Java/Maven, `maven-workspace`). All three share the same shape: one `packages` entry per module path (often `{}` — the module's own manifest already has the name/type the plugin needs), and the ecosystem's workspace plugin turned on in `plugins`.
- **Form C** (`config-per-module-independent.json`): one `packages` entry per module path, each with its own `component` + `include-component-in-tag: true`, `separate-pull-requests: true`, and per-module `extra-files` for any version field outside that module's own manifest (e.g. a plugin's `plugin.json`). No `plugins` key — there's no dependency graph to propagate.

### How Form B's dependency graph is actually discovered

**`release-please-config.json` never states "module X depends on module Y."** It only lists which module paths participate and turns the workspace plugin on. The plugin builds the actual graph by reading each module's *own* manifest at run time:

| Ecosystem | Plugin | Reads the graph from |
| --- | --- | --- |
| Node | `node-workspace` | each `package.json`'s `dependencies`/`devDependencies`/`peerDependencies`, matched against other workspace packages' `name` |
| Rust | `cargo-workspace` | each crate's `Cargo.toml` `path = "../other-crate"` entries |
| Java/Maven | `maven-workspace` | each module's `pom.xml` `<dependency>`/parent-module references |

Worked example (Node, but the mechanic is identical across ecosystems — verified live in [graphprotocol/indexer-rs](https://github.com/graphprotocol/indexer-rs), see `reference/examples.md`): if `packages/cli/package.json` has `"dependencies": { "@scope/core": "^1.2.0" }`, and a `feat:` commit scoped to `packages/core` ships `core` 1.2.0 → 1.3.0, the **same Release PR** also bumps `cli` 2.0.0 → 2.0.1 and its dependency pin to `^1.3.0`, with a "Dependencies" changelog entry — even though nobody touched a `cli` file. By default this propagates even across a *major* bump of the dependency; set `"always-link-local": false` on the plugin to only propagate within-semver-range updates.

Seed `.release-please-manifest.json` with the versions currently in the manifests:

```json
{ ".": "1.4.0" }                                          // Form A: single root entry
{ "packages/a": "0.7.1", "packages/b": "0.2.0" }          // Form B or C: one entry per module path
```

## Phase 4 — Release workflow with a GitHub App token

**The single most-overlooked release-automation gotcha:** PRs and commits created with the default `GITHUB_TOKEN` [do not trigger further workflow runs](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow) — the Release PR would sit there with no CI checks, unmergeable behind any required status check. Therefore release-please must authenticate with a **GitHub App token**, never `GITHUB_TOKEN` (a PAT works but is a long-lived personal credential — the app is the best practice). Bonus: app commits made via the API are signed by GitHub, so they pass a `required_signatures` ruleset (see **`branch-ruleset-setup`**).

One-time app setup (walk the user through it):

1. Create a GitHub App (org or user scope): only **Repository permissions** `Contents: Read and write` + `Pull requests: Read and write`, no webhook.
2. Install it on the target repo.
3. Store the app's **Client ID** as a repo **variable** `RELEASE_PLEASE_APP_CLIENT_ID` and the generated private key as a **secret** `RELEASE_PLEASE_APP_PRIVATE_KEY`. Use the Client ID, not the numeric App ID — GitHub recommends the client ID for app authentication, and the action's `app-id` input is documented as legacy in favor of `client-id`.

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

release-please only sees what lands on the default branch. For a **squash-merge repo** the PR _title_ becomes the commit message, so validate titles with [amannn/action-semantic-pull-request](https://github.com/amannn/action-semantic-pull-request) (own workflow, `pull_request` trigger, `permissions: pull-requests: read`). For merge/rebase repos, enforce commit messages instead (e.g. commitlint). **Ask the user which merge strategy the repo uses** before picking — it's a repo setting, not something to infer from the config.

For Form B/C repos, remind the user that Conventional Commit **scopes** should match `component` names (e.g. `fix(core): ...` for a `packages/core` component) so changes land in the right module's changelog — release-please falls back to path-based detection if the scope is missing or wrong, but an explicit scope is more reliable in a fast-moving monorepo.

## Phase 6 — Wire up publishing

**Ask the user whether the repo publishes artifacts** (npm, marketplace, container) before adding this — not every repo needs it. If it does, chain publish jobs on the release job's output, and delegate the tokenless npm publish setup to the sibling skill **`secure-publish-setup`**:

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

The job is mainly to judge **whether the current setup still makes sense** — fixing drift is only one part. Two kinds of finding, plus an interactive close. Cite evidence (`path:line`, config key, command output) for each.

- **Decisions** (the main pass) — does the *design* still fit today's repo? Raise each with `AskUserQuestion`; never change unilaterally.
- **Defects** — mechanical drift that silently breaks releases. Fix these.
- **Observations** — a deliberate choice (check git history first); note it, don't rewrite.

### 8A — Does the setup still make sense? (decisions)

Re-run **Phase 1** on the repo as it is today, then question each design choice. Divergences are the highest-value thing this audit finds — raise them via `AskUserQuestion` like the Phase 2 form choice:

- **Release form vs. topology:** Form A but packages are now consumed independently → B/C? Form C but packages now depend on each other → B (they won't auto-bump otherwise)? Form B but the ecosystem has no workspace plugin (see the Form B caveat in `reference/examples.md`) → the graph isn't propagating, so A or C? A new top-level package/app no form covers?
- **Validation vs. merge strategy:** check the *current* strategy (`gh api repos/{owner}/{repo} --jq '{squash:.allow_squash_merge,merge:.allow_merge_commit,rebase:.allow_rebase_merge}'`). Squash-merge with no PR-title validation → offer `amannn/action-semantic-pull-request`; a title validator left in place after squash was disabled → commit-message linting is what's needed.
- **Publishing:** repo ships artifacts (npm/marketplace/container) but the workflow stops at the tag (no publish job gated on `releases_created`, Phase 6) → wire it via **`secure-publish-setup`**.
- **Auth:** a PAT instead of a GitHub App token works but is a long-lived personal credential → offer migration (Phase 4). A deliberately-kept PAT is an observation.
- **Scopes (Form B/C):** spot-check recent commits — `fix(core):` scopes should match `component`/path names so changes land in the right changelog.

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
4. **Apply** what was approved, then hand off the **Phase 7** behavioural check as the live proof. Leave observations as observations.

## Resources

- `reference/config-single-release.json` (Form A), `reference/config-per-module-dependency-aware.json` + `.rust.json` + `.maven.json` (Form B, one per ecosystem), `reference/config-per-module-independent.json` (Form C) — copy-ready, annotated templates.
- `reference/examples.md` — real repos (Miragon, emaarco, and well-known OSS monorepos) for each form, verified against their actual `release-please-config.json`, plus the release-please plugin docs.
- release-please action: https://github.com/googleapis/release-please-action
- release-please manifest/config + plugins docs: https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md
- `GITHUB_TOKEN` does not trigger workflows: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow
- actions/create-github-app-token (`client-id` recommended, `app-id` legacy): https://github.com/actions/create-github-app-token
- GitHub App JWT authentication ("Use of the client ID is recommended"): https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app
