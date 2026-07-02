---
name: release-please-setup
description: "Sets up release-please for automated versioning, changelogs, and GitHub releases driven by Conventional Commits: config + manifest files, a release workflow authenticated with a GitHub App token (never the default GITHUB_TOKEN), and PR-title validation for squash-merge repos. Use when asked to set up release automation, automated versioning or changelogs, or release-please."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, AskUserQuestion
---

# Skill: release-please-setup

Sets up [release-please](https://github.com/googleapis/release-please): it parses Conventional Commits on the default branch, maintains a rolling **Release PR** (version bump + CHANGELOG), and cuts the GitHub release + tag when that PR is merged. Reference implementation: [Miragon/wardley-maps-modeler](https://github.com/Miragon/wardley-maps-modeler) (`release-please.yml`, `release-please-config.json`, `.release-please-manifest.json`).

Run this when asked to "set up release automation" / release-please, or as the versioning slice of a release/supply-chain audit (see the sibling skill **`release-audit`**).

## Phase 1 — Detect topology & write config

Determine single package vs. monorepo (`workspaces` in `package.json`, multiple manifests) and the ecosystem (`release-type: node` for JS/TS; `simple`, `python`, `go`, etc. otherwise — check the [release-please docs](https://github.com/googleapis/release-please/blob/main/docs/customizing.md) for the stack).

Create both files at the repo root:

```jsonc
// release-please-config.json — single package or shared-version monorepo
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "node",
  "include-component-in-tag": false,
  "bump-minor-pre-major": true,
  "packages": {
    ".": {
      "package-name": "<repo-name>",
      "changelog-path": "CHANGELOG.md"
    }
  }
}
```

```json
{ ".": "<current-version>" }
```

(`.release-please-manifest.json` — seed with the version currently in `package.json`.)

**Monorepo with one shared version line** (the reference repo's approach): keep the single root package above and add `extra-files` entries so every workspace `package.json` version — and cross-workspace dependency pins — are bumped in lockstep:

```jsonc
"extra-files": [
  { "type": "json", "path": "packages/<pkg>/package.json", "jsonpath": "$.version" },
  { "type": "json", "path": "packages/<app>/package.json", "jsonpath": "$.dependencies['<pkg-name>']" }
]
```

**Monorepo with independent versions per package**: instead list each package under `packages:` and use the `node-workspace` plugin (plus `linked-versions` for packages that must move together). Prefer the shared-version setup unless packages genuinely release independently.

## Phase 2 — Release workflow with a GitHub App token

**The single most-overlooked release-automation gotcha:** PRs and commits created with the default `GITHUB_TOKEN` [do not trigger further workflow runs](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow) — the Release PR would sit there with no CI checks, unmergeable behind any required status check. Therefore release-please must authenticate with a **GitHub App token**, never `GITHUB_TOKEN` (a PAT works but is a long-lived personal credential — the app is the best practice). Bonus: app commits made via the API are signed by GitHub, so they pass a `required_signatures` ruleset (see **`branch-ruleset-setup`**).

One-time app setup (walk the user through it):

1. Create a GitHub App (org or user scope): only **Repository permissions** `Contents: Read and write` + `Pull requests: Read and write`, no webhook.
2. Install it on the target repo.
3. Store the App ID as a repo **variable** `RELEASE_PLEASE_APP_ID` and the generated private key as a **secret** `RELEASE_PLEASE_APP_PRIVATE_KEY`.

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
          app-id: ${{ vars.RELEASE_PLEASE_APP_ID }}
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

- [ ] Workflow YAML parses; actions SHA-pinned; `vars.RELEASE_PLEASE_APP_ID` / secret exist (`gh variable list`, `gh secret list`)
- [ ] Merge a `feat:`/`fix:` commit to main → a Release PR appears with the correct version bump and CHANGELOG entry, **and CI runs on it** (the app-token proof)
- [ ] Merge the Release PR → GitHub release + tag created; manifest updated
- [ ] Monorepo: every `extra-files` path was bumped in the Release PR

## Sources

- release-please action: https://github.com/googleapis/release-please-action
- release-please manifest/config docs: https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md
- `GITHUB_TOKEN` does not trigger workflows: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow
- actions/create-github-app-token: https://github.com/actions/create-github-app-token
- Reference implementation: https://github.com/Miragon/wardley-maps-modeler
