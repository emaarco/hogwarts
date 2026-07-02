---
name: pin-node-dependencies
description: "Supply-chain audit for Node.js (js/ts) repos: verifies every package.json dependency is pinned to an exact version (no ^ ~ >= * latest or mutable git refs), checks the lockfile is committed, reports drift with evidence, optionally rewrites to exact pins, and wires up the Miragon/pin-npm-dependencies CI guardrail + save-exact."
allowed-tools: Bash, Read, Edit, Grep, Glob, WebFetch
---

# Skill: pin-node-dependencies

Audits a Node.js / JS / TS repository and verifies that **every dependency in every `package.json` is pinned to an exact version**. Version ranges (`^1.2.3`, `~1.2.3`, `>=1`, `*`, `1.x`), floating dist-tags (`latest`, `next`), and mutable git refs (`#main`) mean `npm install` can silently pull a *different* build than the one that was reviewed and tested — the delivery vector behind worm-style npm supply-chain attacks. Exact pinning + a committed lockfile makes installs reproducible and shrinks the window for a malicious republish to slip in.

Run this when asked to "check if dependencies are pinned", harden the npm supply chain, or as the Node slice of a release/supply-chain audit. Pairs with **`pin-github-actions`** for the CI side.

## Pinning rule

A spec is **pinned** only when it resolves to one immutable artifact:

| Spec | Verdict |
|---|---|
| `1.2.3`, `1.2.3-beta.1` (exact semver) | ✅ pinned |
| `npm:pkg@1.2.3` (exact alias) | ✅ pinned |
| `git+https://…#<40-hex-sha>` (commit-pinned git dep) | ✅ pinned |
| `https://…/pkg-1.2.3.tgz` (exact tarball) | ✅ pinned |
| `workspace:*` / `workspace:^` (workspace protocol, monorepo) | ✅ N/A — resolved locally at publish |
| `file:`, `link:`, `portal:` (local) | ✅ N/A |
| `^1.2.3`, `~1.2.3`, `>=1`, `<2`, `1.2.x`, `*`, `1 \|\| 2` | ❌ range |
| `latest`, `next`, any dist-tag | ❌ floating |
| `git+https://…#main` / `#master` / branch/tag | ❌ mutable ref |

Applies to `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`. (`peerDependencies` are intentionally ranged in *published libraries* — flag them as `Low`/optional there, not as a hard failure.) This mirrors the repo's existing `package-json-style` rule.

## Phase 1 — Detect

Find every manifest (skip `node_modules`) and scan the four dependency blocks:

```bash
find . -name package.json -not -path '*/node_modules/*' -not -path '*/.git/*'

# Per file, list specs that are NOT exact (null-safe over missing blocks; keeps the block name):
jq -r '
  to_entries[]
  | select(.key | IN("dependencies","devDependencies","peerDependencies","optionalDependencies"))
  | .key as $block | .value | to_entries[]
  | select(.value | test("^([0-9]+\\.[0-9]+\\.[0-9]+([-+][0-9A-Za-z.-]+)?$|workspace:|file:|link:|portal:|npm:.*@[0-9]+\\.[0-9]+\\.[0-9]+([-+][0-9A-Za-z.-]+)?$|git\\+.*#[0-9a-f]{40}$|https?://.*\\.(tgz|tar\\.gz)$)") | not)
  | "\($block)  \(.key): \(.value)"
' path/to/package.json
```

The semver, `npm:` alias, git, and tarball alternatives are end-anchored (`$`) on purpose — without the anchor, prefix matches classify hyphen ranges (`1.2.3 - 2.0.0`), OR ranges (`1.2.3 || 2.x`), and floating aliases (`npm:pkg@1.x`) as pinned. Keep the anchors if you adapt the filter.

Detect the package manager + lockfile so transitive deps are covered too:

```bash
ls package-lock.json npm-shrinkwrap.json pnpm-lock.yaml yarn.lock bun.lock bun.lockb 2>/dev/null
git ls-files | grep -E '(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lock|bun\.lockb)$'
```

## Phase 2 — Classify & report

Report a table per manifest, **unpinned-first**, with severity:

- `High` — runtime `dependencies` with a range/dist-tag, or any mutable git ref → ships unreviewed code to production.
- `Medium` — `devDependencies`/`optionalDependencies` with a range.
- `Low` — `peerDependencies` ranges in a published library (often intentional).

| package.json | Dependency | Spec | Block | Verdict | Severity |
|---|---|---|---|---|---|

Then a **lockfile finding**: pinning `package.json` alone does **not** pin transitive dependencies — flag `High` if no lockfile is committed (`git ls-files` shows none), since direct pins still float underneath. Recommend committing the lockfile and using `npm ci` (not `npm install`) in CI.

End with: `N manifests · M deps · K unpinned · lockfile: present/missing`.

## Phase 3 — Fix (only when the user asks)

Convert each ranged spec to the **currently-resolved exact version** — prefer the version already in the lockfile (what's actually installed) over the registry's newest, so the fix doesn't silently bump:

```bash
# Resolved version from a committed lockfile (npm v3 lockfile):
jq -r '.packages["node_modules/<pkg>"].version' package-lock.json
# Fallback (introduces newest — confirm with the user first):
npm view <pkg> version
```

Rewrite the spec in `package.json`, then make exact-pinning the local default so new installs stay pinned:

```bash
# .npmrc — applies to npm install / npm i --save
save-exact=true
```

(pnpm: `save-exact=true` in `.npmrc`; yarn classic: `--exact` / `save-exact true` in `.yarnrc`.) Refresh the lockfile (`npm install`) and re-run Phase 1 to confirm zero ranges remain.

## Phase 4 — CI guardrail & automation

Add a CI check so ranges can never reappear, and keep pins fresh.

**Enforce exact pins in CI** with [`Miragon/pin-npm-dependencies`](https://github.com/Miragon/pin-npm-dependencies) — a GitHub Action that fails the build if any `package.json` uses a range, wildcard, dist-tag, or mutable git ref. Pin the action itself to a SHA (see `pin-github-actions`):

```yaml
# .github/workflows/ci.yml
permissions:
  contents: read
jobs:
  pin-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: Miragon/pin-npm-dependencies@58fe24377aef66748a1444ff69ab05e3f938a798 # v1.2.1
```

The SHAs/versions in the snippet are placeholders that drift — resolve each action's current release SHA at apply time (`gh api repos/<owner>/<repo>/commits/<latest-tag> --jq .sha`, as `pin-github-actions` Phase 3 does) instead of copying them verbatim.

Useful inputs: `root-path` (scan a monorepo subdir), `files` (explicit newline-separated list), `check-peer-dependencies` (default `false`), `check-optional-dependencies` (default `true`). Recursive scan from repo root is the default.

**Keep exact pins current** — exact pins go stale, so let a bot bump them with a cooldown that blunts compromised-release windows:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule: { interval: weekly }
    cooldown: { default-days: 5 }   # don't adopt a release in its first days
```

(Renovate equivalent: `rangeStrategy: "pin"` + `minimumReleaseAge`.)

## Sources

- Miragon/pin-npm-dependencies: https://github.com/Miragon/pin-npm-dependencies
- npm `save-exact` config: https://docs.npmjs.com/cli/using-npm/config#save-exact
- npm `ci` (reproducible installs from lockfile): https://docs.npmjs.com/cli/commands/npm-ci
- Dependabot cooldown: https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file#cooldown
