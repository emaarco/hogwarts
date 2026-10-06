---
name: secure-publish-setup
description: "Sets up tokenless npm publishing via OIDC trusted publishing: no NPM_TOKEN secret, automatic provenance attestations, and an idempotent publish step. Use when asked to publish npm packages securely, remove or replace NPM_TOKEN, or set up trusted publishing / provenance."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebFetch, AskUserQuestion
---

# Skill: secure-publish-setup

Replaces long-lived registry tokens with **OIDC trusted publishing** ([GA since 2025-07-31](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)): the workflow proves its identity to npm via a short-lived OIDC token, npm accepts the publish without any `NPM_TOKEN`, and automatically attaches **provenance attestations** (cryptographic proof of source repo + build). Reference implementation: [Miragon/wardley-maps-modeler](https://github.com/Miragon/wardley-maps-modeler) (`publish-npm-package.yml`).

Run this when asked to set up secure/tokenless npm publishing, or as the publishing slice of a release/supply-chain audit (see the sibling skill **`release-audit`**). Typically chained after **`release-please-setup`** (`if: releases_created == 'true'`).

## Phase 1 — Check preconditions

- [ ] npm CLI **≥ 11.5.1** and Node **≥ 22.14** in the publish job (`actions/setup-node` with `node-version: 24` covers both)
- [ ] **GitHub-hosted runners** — self-hosted runners are not supported for trusted publishing
- [ ] Provenance requires a **public repo** — for private repos, trusted publishing still works but publish with `--provenance=false`
- [ ] The package already exists on npm (`npm view <package> name` succeeds) — a trusted publisher is configured per existing package, and OIDC cannot perform a package's first publish ([npm/cli#8544](https://github.com/npm/cli/issues/8544)). For a new name, follow the **brand-new package** path below
- [ ] **Every publishable `package.json` has a `repository` field** whose `url` points at the GitHub repo — and, for monorepo workspaces, a `directory` field pointing at the package's subpath. Provenance embeds the source repo and npm validates it against each package's `repository.url`; a missing/empty field fails the publish with **`npm error code E422 … Failed to validate repository information: package.json: "repository.url" is ""`**. This is the single most common first-release surprise — check it before you ever run the workflow.

Run the bundled guard against the target repo to catch every package missing the field — it walks the `workspaces` globs (or the root package if there are none), honours `private`, and checks each `repository.url` matches this repo:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/secure-publish-setup/scripts/check-publish-metadata.mjs"
```

The script stays in the skill and is run **once**, here — it is deliberately **not** copied into the target repo, so there is one home to maintain instead of drifting copies scattered across every repo. The accepted tradeoff: a later manual edit to `package.json` won't be re-checked. (A `publish --dry-run` wouldn't catch it either — the `repository ↔ provenance` mismatch is a server-side registry validation that only fires on the real publish.)

If any of these fail, report it and agree on a fallback with the user (e.g. granular automation token in a protected environment) instead of silently downgrading. For a **missing `repository` field**, the fix is to **add it, not to disable provenance** — offer to write the block into each flagged `package.json`:

```jsonc
"repository": {
  "type": "git",
  "url": "git+https://github.com/<org>/<repo>.git",
  "directory": "packages/<name>"   // omit for a single-package repo
}
```

### Brand-new package

A name that is not on the registry yet needs a placeholder version before a trusted publisher can be attached:

1. Publish a placeholder by hand from a scratch directory — a `package.json` with only `name`, `version` and a description is enough, no third-party bootstrap tool needed:

   ```bash
   mkdir placeholder && cd placeholder
   echo '{ "name": "<package>", "version": "0.0.0", "description": "Placeholder, real release follows" }' > package.json
   npm publish --access public
   ```

2. Configure the trusted publisher (Phase 2).
3. Let the workflow publish the first real version (Phase 3).
4. Deprecate the placeholder: `npm deprecate <package>@0.0.0 "Placeholder, use a later version"`.

## Phase 2 — Configure the trusted publisher

Step for the user, run from their own terminal — it needs their npm login and a one-time password:

```bash
npm trust github <package> --repo <owner>/<repo> --file <caller-workflow>.yml --env <environment> --allow-publish
npm trust list <package>
```

Requirements for `npm trust`:

- npm **≥ 11.15.0** on the user's machine (newer than the 11.5.1 the publish job needs)
- **Account-level 2FA** enabled — the command asks for a one-time password
- The package **already exists** on the registry (Phase 1)
- `--env` matches the `environment:` of the publish job (`npm` in Phase 3); drop the flag if the job uses no environment
- The registry holds **one** configuration per package — to change an existing one, look up its id with `npm trust list <package>` and remove it with `npm trust revoke <package> --id=<trust-id>` first

Fallback without the CLI: on npmjs.com, package page → **Settings → Trusted publisher** → GitHub Actions, then enter organization/user, repository, workflow filename and environment.

⚠️ Three gotchas to state explicitly:

- The filename passed to `--file` must match **exactly** (case-sensitive, including `.yml`).
- With reusable workflows, npm validates the **calling** workflow's filename, not the called one — register the caller (e.g. `release-please.yml`), not `publish-npm-package.yml`.
- A newly created configuration must complete its **first successful publish within 2 days**. Run `npm trust` shortly before the first release — once the publish workflow (Phase 3) is merged — not days ahead.

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

No `NODE_AUTH_TOKEN`, no `NPM_TOKEN` — that is the point. Remove any existing `NPM_TOKEN` secret once the OIDC path is verified. For monorepos, take a `package` input and publish with `-w "packages/${{ inputs.package }}"` (see the reference repo) — and note each workspace's `package.json` needs its **own** `repository.url` **plus** a matching `directory` (per the Phase 1 check), or provenance fails that workspace's publish with E422 even when the others pass.

## Phase 4 — Secrets that cannot be OIDC

Some targets still require a long-lived token (e.g. the VS Code Marketplace `VSCE_PAT`, Open VSX `OVSX_PAT`). Keep each one in a **protected GitHub Environment** (e.g. `environment: vscode-marketplace`) — never as a plain repo secret — so it is only exposed to jobs that deploy to that target and can be gated by required reviewers.

## Phase 5 — Verify

- [ ] Every publishable `package.json` has a `repository.url` (+ monorepo `directory`) — the Phase 1 check passes, so provenance validation won't E422 at release time
- [ ] Publish job succeeds with **no** registry token in `gh secret list`
- [ ] `npm view <pkg> --json | jq .dist.attestations` shows attestations; the npm package page shows the provenance badge
- [ ] Re-running the workflow on the same version skips instead of failing
- [ ] `npm trust list <package>` shows the caller workflow filename, repository and environment the publish job actually uses
- [ ] For a brand-new package, the placeholder version is deprecated

## Sources

- npm trusted publishers (requirements, reusable-workflow caveat, 2-day first-publish window): https://docs.npmjs.com/trusted-publishers/
- `npm trust` (create, list, revoke trusted-publisher configurations): https://docs.npmjs.com/cli/v11/commands/npm-trust
- First publish via OIDC not supported yet: https://github.com/npm/cli/issues/8544
- GA announcement (2025-07-31): https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/
- npm provenance: https://docs.npmjs.com/generating-provenance-statements/
- GitHub Environments: https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment
- Reference implementation: https://github.com/Miragon/wardley-maps-modeler
