---
name: pin-github-actions
description: "Supply-chain audit: verifies every GitHub Actions reference is pinned to a full commit SHA (not a mutable tag or branch), reports unpinned uses with evidence, and optionally rewrites them to SHA + version comment."
allowed-tools: Bash, Read, Edit, Grep, Glob, WebFetch
---

# Skill: pin-github-actions

Audits a repository's GitHub Actions and verifies that **every action reference is pinned to a full-length commit SHA**. Mutable tags (`@v4`, `@v4.2.2`) and branches (`@main`) can be silently repointed by whoever controls the upstream repo — the [`tj-actions/changed-files` compromise (CVE-2025-30066, March 2025)](https://github.com/tj-actions/changed-files/security/advisories) repointed existing tags to a malicious commit that dumped CI secrets; only SHA-pinned consumers were unaffected. SHA pinning is the [GitHub-recommended hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#using-third-party-actions) and the OpenSSF Scorecard [`Pinned-Dependencies`](https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies) check.

Run this when asked to "check if actions are pinned", harden CI supply chain, or as the GitHub-Actions slice of a release/supply-chain audit (see the sibling skill **`release-audit`**).

## Pinning rule

A reference is **pinned** only when the ref after `@` is a full 40-hex-character git commit SHA, ideally followed by a comment naming the human-readable version:

```yaml
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
```

(The SHA/version above only illustrates the format — never copy it; resolve the current SHA fresh via the Phase 3 commands.)

| Reference form | Verdict |
|---|---|
| `owner/repo@<40-hex-sha>` | ✅ pinned |
| `owner/repo/path@<40-hex-sha>` (action in subdir) | ✅ pinned |
| `owner/repo/.github/workflows/x.yml@<40-hex-sha>` (reusable workflow) | ✅ pinned |
| `docker://image@sha256:<digest>` | ✅ pinned |
| `owner/repo@v4` / `@v4.2.2` (tag) | ❌ mutable |
| `owner/repo@main` / `@master` (branch) | ❌ mutable |
| `docker://image:tag` | ❌ mutable |
| `./.github/actions/foo` (local, same repo) | ✅ N/A — no pin needed |

> First-party `actions/*` and `github/*` are lower-risk but **still in scope** — pin them too (Scorecard makes no exception). If the team deliberately allows major-tag for first-party actions, record it as a documented exception, not a silent gap.

## Phase 1 — Detect

Find every action reference across workflows and composite/local actions:

```bash
# Workflows + composite action definitions
grep -rEno '^[[:space:]]*-?[[:space:]]*uses:[[:space:]]*\S+' \
  .github/workflows .github/actions 2>/dev/null
```

Also scan `action.yml` / `action.yaml` anywhere in the repo (composite actions can `uses:` other actions).

## Phase 2 — Classify & report

For each `uses:` line, strip any inline comment, take the ref after the last `@`, and classify it against the table above. A ref is pinned iff it matches `^[0-9a-f]{40}$` (or `sha256:` for `docker://`). Local `./` references need no pin.

Report findings as a table, **sorted unpinned-first**, with severity:

- `High` — third-party action pinned to a **branch** (`@main`) or a **floating tag** (`@v4`); fully attacker-controllable.
- `Medium` — third-party action pinned to an **immutable-looking patch tag** (`@v4.2.2`); still mutable in principle (tags can be force-moved).
- `Low` — first-party `actions/*` / `github/*` on a tag.
- `OK` / `N/A` — SHA-pinned, or local action.

| File:line | Reference | Current ref | Verdict | Severity |
|---|---|---|---|---|

End with a one-line summary: `N references · M pinned · K unpinned`.

## Phase 3 — Fix (only when the user asks)

For each unpinned third-party reference, resolve the ref to its current SHA and rewrite in place, preserving the original version as a trailing comment:

```bash
# Resolve a tag/branch to its commit SHA
gh api repos/<owner>/<repo>/commits/<ref> --jq '.sha'
# Offline / no gh: git ls-remote https://github.com/<owner>/<repo> <ref>
```

Then edit the line to `uses: owner/repo@<sha> # <original-ref>`. Resolve the SHA from the **upstream tag**, not from a third-party mirror, and only after confirming the tag currently points where expected. Re-run Phase 1 to confirm zero unpinned references remain.

## Phase 4 — Recommend automation & enforcement

SHA pins are static, so leave the repo a way to keep them current and to fail the build on regressions:

- **Keep pins fresh** — Dependabot updates SHA pins *and* the version comment automatically:
  ```yaml
  # .github/dependabot.yml
  version: 2
  updates:
    - package-ecosystem: github-actions
      directory: "/"
      schedule: { interval: weekly }
  ```
  (Renovate's `helpers:pinGitHubActionDigests` preset is the equivalent.)
- **Bulk-pin existing repos** — `pinact` or `ratchet pin` rewrite all tags to SHAs in one pass.
- **Enforce in CI** — fail PRs that introduce unpinned actions, e.g. `zgosalvez/github-actions-ensure-sha-pinned-actions` (itself SHA-pinned), or OpenSSF Scorecard's `Pinned-Dependencies` check.

## Sources

- GitHub — Security hardening for GitHub Actions: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#using-third-party-actions
- OpenSSF Scorecard — Pinned-Dependencies: https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- tj-actions/changed-files advisory (CVE-2025-30066): https://github.com/tj-actions/changed-files/security/advisories
- Dependabot for Actions: https://docs.github.com/en/code-security/dependabot/working-with-dependabot/keeping-your-actions-up-to-date-with-dependabot
