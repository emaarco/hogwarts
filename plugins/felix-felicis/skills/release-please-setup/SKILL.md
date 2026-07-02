---
name: release-please-setup
description: "Sets up release-please for automated versioning, changelogs, and GitHub releases driven by Conventional Commits: config + manifest files, a release workflow authenticated with a GitHub App token (never the default GITHUB_TOKEN), and PR-title validation for squash-merge repos. Use when asked to set up release automation, automated versioning or changelogs, or release-please."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, AskUserQuestion
metadata:
  status: beta
---

# Skill: release-please-setup

Sets up [release-please](https://github.com/googleapis/release-please): it parses Conventional Commits on the default branch, maintains a rolling **Release PR** (version bump + CHANGELOG), and cuts the GitHub release + tag when that PR is merged. Two reference implementations, one per versioning model:

- **Shared version line** (all modules move together): [Miragon/wardley-maps-modeler](https://github.com/Miragon/wardley-maps-modeler)
- **Independent versions per module**: [emaarco/hogwarts](https://github.com/emaarco/hogwarts) (one release line per plugin in a marketplace monorepo)

Run this when asked to "set up release automation" / release-please, or as the versioning slice of a release/supply-chain audit (see the sibling skill **`release-audit`**).

## Phase 1 — Detect topology & pick the versioning model

Determine single package vs. multi-module (`workspaces` in `package.json`, multiple manifests/plugins) and the ecosystem — `release-type: node` for JS/TS packages, `simple` for anything release-please has no native type for (version files bumped via `extra-files`); see the [release-please docs](https://github.com/googleapis/release-please/blob/main/docs/customizing.md) for `python`, `go`, etc.

For a multi-module repo, **ask the user which model fits (AskUserQuestion)** — this is a product decision, not a technical one:

| Model | Behavior | Choose when | Reference / template |
|---|---|---|---|
| **Shared version line** | One Release PR, one tag; every module bumps in lockstep | Modules ship as one product; cross-module dependency pins must stay aligned | wardley-maps-modeler → `reference/config-shared-version.json` |
| **Independent versions** | One release line, tag (`<component>@vX.Y.Z`), and CHANGELOG per module; `separate-pull-requests` for isolated Release PRs | Modules evolve at their own pace and are consumed independently (e.g. plugins, libraries) | emaarco/hogwarts → `reference/config-independent-versions.json` |

Copy the matching template from this skill's `reference/` folder to `release-please-config.json`, replace the placeholder paths/names, and seed `.release-please-manifest.json` with the versions currently in the manifests:

```json
{ ".": "1.4.0" }                                          // shared: single root entry
{ "plugins/a": "0.7.1", "plugins/b": "0.2.0" }            // independent: one entry per module path
```

Key mechanics to preserve from the templates:

- **Shared**: single root package, `include-component-in-tag: false`, `extra-files` entries bump every module version *and* cross-module dependency pins in lockstep.
- **Independent**: one `packages` entry per module path with its own `component`, `include-component-in-tag: true`, `separate-pull-requests: true`; per-module `extra-files` for version fields outside the module's own manifest. For npm workspaces that depend on each other, add the `node-workspace` plugin so internal dependency pins are bumped on release.

## Phase 2 — Release workflow with a GitHub App token

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

## Phase 3 — Conventional Commits prerequisite

release-please only sees what lands on the default branch. For a **squash-merge repo** the PR *title* becomes the commit message, so validate titles with [amannn/action-semantic-pull-request](https://github.com/amannn/action-semantic-pull-request) (own workflow, `pull_request` trigger, `permissions: pull-requests: read` — see `pr-title.yml` in the reference repo). For merge/rebase repos, enforce commit messages instead (e.g. commitlint). Confirm the merge strategy with the user before picking.

## Phase 4 — Wire up publishing

If the repo publishes artifacts (npm, marketplace, container), chain publish jobs on the release job's output — and delegate the tokenless npm publish setup to the sibling skill **`secure-publish-setup`**:

```yaml
  publish:
    needs: release-please
    if: needs.release-please.outputs.releases_created == 'true'
    permissions:
      contents: read
      id-token: write
    uses: ./.github/workflows/publish-npm-package.yml
```

## Phase 5 — Verify

- [ ] Workflow YAML parses; actions SHA-pinned; `vars.RELEASE_PLEASE_APP_CLIENT_ID` / secret exist (`gh variable list`, `gh secret list`)
- [ ] Merge a `feat:`/`fix:` commit to main → a Release PR appears with the correct version bump and CHANGELOG entry, **and CI runs on it** (the app-token proof)
- [ ] Merge the Release PR → GitHub release + tag created; manifest updated
- [ ] Shared model: every `extra-files` path was bumped in the Release PR
- [ ] Independent model: a change scoped to one module produces a Release PR, tag (`<component>@vX.Y.Z`), and CHANGELOG for that module only

## Sources

- release-please action: https://github.com/googleapis/release-please-action
- release-please manifest/config docs: https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md
- `GITHUB_TOKEN` does not trigger workflows: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow
- actions/create-github-app-token (`client-id` recommended, `app-id` legacy): https://github.com/actions/create-github-app-token
- GitHub App JWT authentication ("Use of the client ID is recommended"): https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app
- Reference implementation (shared version line): https://github.com/Miragon/wardley-maps-modeler
- Reference implementation (independent versions per module): https://github.com/emaarco/hogwarts
