---
name: secure-publish-setup
description: "Sets up tokenless npm publishing via OIDC trusted publishing: no NPM_TOKEN secret, automatic provenance attestations, an idempotent skip-if-already-published step, a reusable workflow_call structure, and GitHub Environments for any unavoidable long-lived secrets. Use when asked to publish npm packages securely, remove or replace NPM_TOKEN, or set up trusted publishing / provenance."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, AskUserQuestion
metadata:
  status: beta
---

# Skill: secure-publish-setup

Replaces long-lived registry tokens with **OIDC trusted publishing** ([GA since 2025-07-31](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)): the workflow proves its identity to npm via a short-lived OIDC token, npm accepts the publish without any `NPM_TOKEN`, and automatically attaches **provenance attestations** (cryptographic proof of source repo + build). Reference implementation: [Miragon/wardley-maps-modeler](https://github.com/Miragon/wardley-maps-modeler) (`publish-npm-package.yml`).

Run this when asked to set up secure/tokenless npm publishing, or as the publishing slice of a release/supply-chain audit (see the sibling skill **`release-audit`**). Typically chained after **`release-please-setup`** (`if: releases_created == 'true'`).

## Phase 1 — Check preconditions

- [ ] npm CLI **≥ 11.5.1** and Node **≥ 22.14** in the publish job (`actions/setup-node` with `node-version: 24` covers both)
- [ ] **GitHub-hosted runners** — self-hosted runners are not supported for trusted publishing
- [ ] Provenance requires a **public repo** — for private repos, trusted publishing still works but publish with `--provenance=false`
- [ ] The package already exists on npm, or do the very first publish manually (a trusted publisher is configured per existing package)

If any of these fail, report it and agree on a fallback with the user (e.g. granular automation token in a protected environment) instead of silently downgrading.

## Phase 2 — Configure the trusted publisher on npmjs.com

Manual step for the user (no API for this): package page → **Settings → Trusted publisher** → GitHub Actions, then enter organization/user, repository, and the **workflow filename**.

⚠️ Two gotchas to state explicitly:

- The filename must match **exactly** (case-sensitive, including `.yml`).
- With reusable workflows, npm validates the **calling** workflow's filename, not the called one — register the caller (e.g. `release-please.yml`), not `publish-npm-package.yml`.

## Phase 3 — Publish workflow

Reusable workflow so several packages/jobs share one publish path. `id-token: write` must be set in **both** the caller job and the called workflow. Gate the job behind a GitHub Environment (`environment: npm`) so deployments are auditable and can require reviewers. The publish step is **idempotent** — re-runs must not fail on an already-published version:

```yaml
# .github/workflows/publish-npm-package.yml
name: Publish npm package

on:
  workflow_call:

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v7          # SHA-pin in the real repo (see pin-github-actions)
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run build
      - name: Publish (skip if version already on the registry)
        run: |
          name="$(node -p "require('./package.json').name")"
          version="$(node -p "require('./package.json').version")"
          if npm view "$name@$version" version > /dev/null 2>&1; then
            echo "$name@$version already published — skipping"
          else
            npm publish --provenance --access public
          fi
```

No `NODE_AUTH_TOKEN`, no `NPM_TOKEN` — that is the point. Remove any existing `NPM_TOKEN` secret once the OIDC path is verified. For monorepos, take a `package` input and publish with `-w "packages/${{ inputs.package }}"` (see the reference repo).

## Phase 4 — Secrets that cannot be OIDC

Some targets still require a long-lived token (e.g. the VS Code Marketplace `VSCE_PAT`, Open VSX `OVSX_PAT`). Keep each one in a **protected GitHub Environment** (e.g. `environment: vscode-marketplace`) — never as a plain repo secret — so it is only exposed to jobs that deploy to that target and can be gated by required reviewers.

## Phase 5 — Verify

- [ ] Publish job succeeds with **no** registry token in `gh secret list`
- [ ] `npm view <pkg> --json | jq .dist.attestations` shows attestations; the npm package page shows the provenance badge
- [ ] Re-running the workflow on the same version skips instead of failing
- [ ] Caller workflow filename matches the trusted-publisher config on npmjs.com

## Sources

- npm trusted publishers (requirements, reusable-workflow caveat): https://docs.npmjs.com/trusted-publishers/
- GA announcement (2025-07-31): https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/
- npm provenance: https://docs.npmjs.com/generating-provenance-statements/
- GitHub Environments: https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment
- Reference implementation: https://github.com/Miragon/wardley-maps-modeler
